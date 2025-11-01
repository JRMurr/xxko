import { sql } from 'drizzle-orm';

export const join_with_comma = (vals: readonly string[]) => {
	return sql.join(
		vals.map((x) => sql`${x}`),
		sql`, `
	);
};
