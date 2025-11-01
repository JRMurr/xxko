/* eslint-disable @typescript-eslint/no-unused-vars */
import * as schema from './schema';
import { seed, reset } from 'drizzle-seed';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

async function main() {
	const db = drizzle(process.env.DATABASE_URL!);
	await reset(db, schema);
}

main();
