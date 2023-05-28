import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { request } from "undici";
import { Kysely } from "kysely";
import { Database, db } from "../database";
import { PlanetScaleDialect } from "kysely-planetscale";
import { env } from "../../env.mjs";
import { chunkArray } from "../utils";

export interface HNNews {
	by: string;
	descendants: number;
	id: number;
	score: number;
	time: number;
	title: string;
	type: string;
	url: string;
}

const token = process.env.SLACK_TOKEN;
const hnApi = "https://hacker-news.firebaseio.com/v0";

// https://hacker-news.firebaseio.com/v0/topstories.json
// const web = new WebClient(token);

export async function GET(req: Request) {
	// TODO add secret check

	const { statusCode, body } = await request(`${hnApi}/topstories.json`);

	if (statusCode !== 200) {
		return NextResponse.error();
	}

	const data = (await body.json()) as number[];

	const alreadyPosted = await db
		.selectFrom("news")
		.where("news.id", "in", data)
		.selectAll()
		.execute();

	const notPostedIds = data.filter(
		(el) => !alreadyPosted.find((news) => news.id === el)
	);

	const chunks = chunkArray(notPostedIds, 20);

	const result = await Promise.allSettled(
		chunks.flatMap((a) => {
			return a.map((el) =>
				request(`${hnApi}/item/${el}.json`).then((el) => {
					if (el.statusCode >= 400) {
						throw new Error("Error, status code: " + el.statusCode);
					}
					return el.body.json() as Promise<HNNews>;
				})
			);
		})
	);

	const topNews = result.filter(
		(el) => el.status === "fulfilled" && el.value.score >= 140
	) as PromiseFulfilledResult<HNNews>[];

	await db
		.insertInto("news")
		.values(
			topNews.map(({ value }) => ({
				id: value.id,
				score: value.score,
				title: value.title,
				url: value.url,
				published_at: new Date(value.time * 1000).toISOString(),
			}))
		)
		.execute();

	return NextResponse.json({ topNews });
}
