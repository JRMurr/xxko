import { matchFilterSchema } from '$lib/schemas';
import { getMatches } from '$lib/server/match';
import { searchParamsToValues } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vals = matchFilterSchema.parse(searchParamsToValues(url.searchParams));

	console.log('vals', vals);

	const matches = await getMatches(locals.db, vals);

	return {
		matches
	};
};
