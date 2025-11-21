import { matchFilterSchema } from '$lib/schemas';
import { getMatches } from '$lib/server/match';
import { searchParamsToValues } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vals = matchFilterSchema.parse(searchParamsToValues(url.searchParams));

	const limit = 2;

	const { rows: matches, totalCount: totalMatches } = await getMatches(locals.db, {
		...vals,
		limit
	});

	const totalPages = Math.ceil(totalMatches / limit);

	return {
		matches,
		totalMatches,
		totalPages
	};
};
