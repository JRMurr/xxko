import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

export const createDb = () => {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = new Database(env.DATABASE_URL);
	return drizzle(client, { schema });
};

export const createDbFromClient = (client: Database.Database) => {
	return drizzle(client, { schema });
};

export type xxDatabase = ReturnType<typeof createDbFromClient>;
