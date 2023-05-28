import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable("news")
		.addColumn("id", "integer", (col) => col.primaryKey())
		.addColumn("title", "varchar(255)", (col) => col.notNull())
		.addColumn("url", "varchar(255)", (col) => col.notNull())
		.addColumn("score", "integer", (col) => col.notNull())
		.addColumn("published_at", "timestamp", (col) => col.notNull())
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable("news");
}
