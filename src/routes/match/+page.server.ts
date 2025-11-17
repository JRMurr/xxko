import { matchFilterSchema } from '$lib/schemas';
import { getMatches } from '$lib/server/match';
import type { PageServerLoad } from './$types';

function safeParseJSON(string: string): unknown {
	try {
		return JSON.parse(string);
	} catch {
		return string;
	}
}

function searchParamsToValues(searchParams: URLSearchParams): Record<string, unknown> {
	return Array.from(searchParams.keys()).reduce(
		(record, key) => {
			const values = searchParams.getAll(key).map(safeParseJSON);
			return { ...record, [key]: values.length > 1 ? values : values[0] };
		},
		{} as Record<string, unknown>
	);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const vals = matchFilterSchema.parse(searchParamsToValues(url.searchParams));

	const matches = await getMatches(locals.db, vals);

	console.log('vals', vals, 'matches', matches.length);

	return {
		matches
	};
};
