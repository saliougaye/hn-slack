import { ColumnType, Kysely } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";
import { env } from "../env.mjs";

export interface Database {
	news: {
		id: number;
		title: string;
		url: string;
		score: number;
		published_at: ColumnType<Date, string | undefined, never>;
	};
}

export const db = new Kysely<Database>({
	dialect: new PlanetScaleDialect({
		url: env.DATABASE_URL,
		fetch,
	}),
});
