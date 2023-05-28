import * as path from "path";
import { promises as fs } from "fs";
import { Database } from "./app/database";
import { Kysely, Migrator, FileMigrationProvider } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";
import { fetch } from "undici";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

export const migrator = async () => {
	const db = new Kysely<Database>({
		dialect: new PlanetScaleDialect({
			url: process.env.DATABASE_URL,
			fetch,
		}),
	});

	const migrator = new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs,
			path,
			migrationFolder: path.join(__dirname, "./migrations"),
		}),
	});

	const { error, results } = await migrator.migrateToLatest();

	results?.forEach((it) => {
		if (it.status === "Success") {
			console.log(`migration "${it.migrationName}" was executed successfully`);
		} else if (it.status === "Error") {
			console.error(`failed to execute migration "${it.migrationName}"`);
		}
	});

	if (error) {
		console.error("failed to migrate");
		console.error(JSON.stringify(error, null, 4));
		process.exit(1);
	}

	await db.destroy();
};

migrator();
