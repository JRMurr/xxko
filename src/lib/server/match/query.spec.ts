import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { zocker } from 'zocker';
import { matchSchema } from '$lib/schemas';

import { makeMemoryDb, type TestDb } from '$test/utils';
import { createMatch, getMatches } from '.';

describe('query matches', () => {
	let ctx: TestDb;
	beforeAll(async () => {
		ctx = await makeMemoryDb();

		let idx = 0;
		const fakeMatchGen = zocker(matchSchema)
			.supply(matchSchema.shape.video, () => {
				const time_query = idx > 0 ? `&t=${idx}` : '';
				idx++;
				return `https://www.youtube.com/watch?v=hsP7lO_yz7Q${time_query}`;
			})
			.setSeed(420);

		for (const match of fakeMatchGen.generateMany(20)) {
			await createMatch(ctx.db, match);
		}
	});
	afterAll(async () => {
		if (ctx) {
			await ctx.cleanup();
		}
	});

	it('query no filter', async () => {
		const res = await getMatches(ctx.db, {});

		expect(res).toBeDefined();
		expect(res).toHaveLength(20);
	});
});
