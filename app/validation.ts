import { z } from "zod";

export const topstoriesBodyValidation = z.number().array();

export const newsValidation = z.object({
	id: z.number(),
	title: z.string(),
	url: z.string().url(),
	by: z.string(),
	score: z.number(),
	time: z.number(),
});
