import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { zocker } from 'zocker';
import { matchFilterSchema, matchSchema, type Match, type MatchFilter } from '$lib/schemas';

import { makeMemoryDb, type TestDb } from '$test/utils';
import { createMatch, getMatches } from '.';

describe('query matches', () => {
	let ctx: TestDb;

	const numGenerated = 20;

	const createdMatches: Match[] = [];
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

		for (const match of fakeMatchGen.generateMany(numGenerated)) {
			await createMatch(ctx.db, match);
			createdMatches.push(match);
		}
	});
	afterAll(async () => {
		if (ctx) {
			await ctx.cleanup();
		}
	});

	it('query no filter', async () => {
		const res = await getMatches(ctx.db, matchFilterSchema.parse({ limit: numGenerated }));

		expect(res).toBeDefined();
		expect(res).toHaveLength(numGenerated);
	});

	it('query limit', async () => {
		const res = await getMatches(ctx.db, matchFilterSchema.parse({ limit: 5 }));

		expect(res).toBeDefined();
		expect(res).toHaveLength(5);
	});

	describe('filter', () => {
		// need thunk for filter since createdMatches isn't defined when this array is setup
		const filterTests: { name: string; filterFn: () => MatchFilter }[] = [
			{
				name: 'player',
				filterFn: () =>
					matchFilterSchema.parse({
						player: createdMatches[0].left.pointPlayerName
					})
			},
			{
				name: 'character - left',
				filterFn: () =>
					matchFilterSchema.parse({
						character: [createdMatches[0].left.team.pointChar]
					})
			},
			{
				name: 'character - right',
				filterFn: () =>
					matchFilterSchema.parse({
						character: [createdMatches[0].right.team.pointChar]
					})
			},
			{
				name: 'fuse - left',
				filterFn: () =>
					matchFilterSchema.parse({
						fuse: [createdMatches[0].left.team.fuse]
					})
			},
			{
				name: 'fuse - right',
				filterFn: () =>
					matchFilterSchema.parse({
						fuse: [createdMatches[0].right.team.fuse]
					})
			}
		];

		it.each(filterTests)('$name', async ({ filterFn }) => {
			const filter_base = filterFn();

			// add a bigger limit always to make sure if the filter does nothing we know
			const filter = { ...filter_base, limit: numGenerated + 10 };

			const res = await getMatches(ctx.db, filter);

			expect(res).toBeDefined();
			expect(res.length).toBeGreaterThan(0);
			expect(res.length).toBeLessThan(numGenerated);
		});
	});
});
