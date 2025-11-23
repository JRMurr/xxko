function safeParseJSON(string: string): unknown {
	try {
		return JSON.parse(string);
	} catch {
		return string;
	}
}

export function searchParamsToValues(searchParams: URLSearchParams): Record<string, unknown> {
	return Array.from(searchParams.keys()).reduce(
		(record, key) => {
			const values = searchParams.getAll(key).map(safeParseJSON);
			return { ...record, [key]: values.length > 1 ? values : values[0] };
		},
		{} as Record<string, unknown>
	);
}
