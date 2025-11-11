import type { RequestHandler } from '@sveltejs/kit';
import { getMatches, createMatch } from '$lib/server/match';

import { json } from '@sveltejs/kit';
import { matchSchema } from '$lib/schemas';

export const POST: RequestHandler = async ({ request, locals }) => {
	const rawBody = await request.json();

	const parsedBody = matchSchema.parse(rawBody);

	const created = await createMatch(locals.db, parsedBody);

	return json(created);
};

export const GET: RequestHandler = async ({ request, locals }) => {
	const res = await getMatches(locals.db, { limit: 10 });

	return json(res);
};
