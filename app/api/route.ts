import { NextResponse } from "next/server";
import { z } from "zod";
import { request } from "undici";
import { db } from "../database";
import { newsValidation, topstoriesBodyValidation } from "../validation";
import { buildBlocks, chunkArray, slackApi } from "../utils";
import { env } from "../../env.mjs";
import dayjs from "dayjs";

const hnApi = "https://hacker-news.firebaseio.com/v0";

export async function POST(req: Request) {
	try {
		// check secret
		const url = new URL(req.url);
		const secret = url.searchParams.get("secret");
		if (secret !== env.SECRET) {
			return NextResponse.json(
				{
					message: "Unauthorized",
				},
				{
					status: 401,
				}
			);
		}
		// fetch topstories
		const { statusCode, body } = await request(`${hnApi}/topstories.json`);

		if (statusCode !== 200) {
			return NextResponse.error();
		}

		const jsonResponse = await body.json();

		const topStoriesIdResult = await topstoriesBodyValidation.safeParseAsync(
			jsonResponse
		);

		if (!topStoriesIdResult.success) {
			return NextResponse.json(null, {
				status: 202,
			});
		}

		const { data } = topStoriesIdResult;

		// get posts already cached
		const alreadyPosted = await db
			.selectFrom("news")
			.where("news.id", "in", data)
			.selectAll()
			.execute();

		// get the new ones
		const notPostedIds = data.filter(
			(el) => !alreadyPosted.find((news) => news.id === el)
		);

		// divide in chunks to do requests in parallel
		const chunks = chunkArray(notPostedIds, 20);

		const result = await Promise.allSettled(
			chunks.flatMap((a) => {
				return a.map((el) =>
					request(`${hnApi}/item/${el}.json`)
						.then((el) => {
							if (el.statusCode >= 400) {
								throw new Error("Error, status code: " + el.statusCode);
							}

							return el.body.json();
						})
						.then((json) => {
							const res = newsValidation.safeParse(json);

							if (!res.success) {
								throw new Error("News body not valid");
							}

							return res.data;
						})
				);
			})
		);

		// get the successfull responses
		let topNews = result.filter(
			(el) => el.status === "fulfilled" && el.value.score >= 140
		) as PromiseFulfilledResult<z.infer<typeof newsValidation>>[];

		topNews = [topNews[0]];
		// cache news
		await db
			.insertInto("news")
			.values(
				topNews.map(({ value }) => ({
					id: value.id,
					score: value.score,
					title: value.title,
					url: value.url,
					published_at: dayjs(value.time * 1000).format("YYYY-MM-DD hh:mm:ss"),
				}))
			)
			.execute();

		// send to slack
		const blocks = buildBlocks(topNews.map((el) => el.value));
		await slackApi.client.chat.postMessage({
			channel: env.SLACK_CHANNEL,
			blocks,
		});

		// return response
		return NextResponse.json(
			{
				message: "okay",
			},
			{
				status: 200,
			}
		);
	} catch (error) {
		console.log("error: ", error);

		return NextResponse.json(
			{
				message: (error as Error).message,
			},
			{
				status: 500,
			}
		);
	}
}
