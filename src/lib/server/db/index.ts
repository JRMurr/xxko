import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { createClient, type Client } from '@libsql/client';

export const createDb = () => {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = createClient({ url: env.DATABASE_URL });
	return drizzle(client, { schema });
};

export const createDbFromClient = (client: Client) => {
	return drizzle(client, { schema });
};

export type xxDatabase = ReturnType<typeof createDbFromClient>;
