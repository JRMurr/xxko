import { createDbFromClient } from '$lib/server/db';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { pushSQLiteSchema } from 'drizzle-kit/api';
import * as schema from '$lib/server/db/schema';

export async function makeMemoryDb() {
	const dir = await mkdtemp(join(tmpdir(), 'drizzle-'));
	const fileUrl = `file:${join(dir, 'test.sqlite')}`;

	const client = createClient({ url: fileUrl });

	const db = createDbFromClient(client);
	// https://github.com/drizzle-team/drizzle-orm/issues/4205#issue-2890429466
	const { apply } = await pushSQLiteSchema(schema, db);
	await apply();
	return {
		db,
		fileUrl,
		cleanup: async () => {
			await rm(dir, { recursive: true, force: true });
		}
	};
}

export type TestDb = Awaited<ReturnType<typeof makeMemoryDb>>;
