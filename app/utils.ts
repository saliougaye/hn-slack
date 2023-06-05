import { App, Block, KnownBlock } from "@slack/bolt";
import { z } from "zod";
import { env } from "../env.mjs";
import { newsValidation } from "./validation.js";

export const chunkArray = <T>(array: T[], chunkSize: number) => {
	const chunks = [];
	let index = 0;

	while (index < array.length) {
		chunks.push(array.slice(index, index + chunkSize));
		index += chunkSize;
	}

	return chunks;
};

export const slackApi = new App({
	token: env.SLACK_BOT_TOKEN,
	signingSecret: env.SLACK_SIGNING_SECRET,
});

export const buildBlocks = (
	news: z.infer<typeof newsValidation>[]
): KnownBlock[] => {
	return news.map((el) => ({
		type: "section",
		text: {
			type: "mrkdwn",
			text: `*${el.title}* by *${el.by}*\n*Score*: ${el.score}🌟\n<${el.url}|*Link to the post*>`,
		},
		block_id: el.id.toString(),
	}));
};
