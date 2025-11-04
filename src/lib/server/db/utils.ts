import { sql } from 'drizzle-orm';

export const join_with_comma = (vals: readonly string[]) => {
	const joined = vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
	return sql.raw(joined);
};
