import { z } from 'zod';
import { CHARACTERS, FUSE } from '$lib/constants';

/** ---------- helpers ---------- */

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

type YouTubeRef = { id: string; start?: number | undefined };

const readStartSeconds = (u: URL): number | undefined => {
	// query (?t=3886 or ?start=3886)
	const q = u.searchParams.get('t') ?? u.searchParams.get('start');
	if (q && /^\d+$/.test(q)) return Number(q);

	// hash (#t=3886 or #start=3886)
	if (u.hash) {
		const h = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
		for (const kv of h.split('&')) {
			const [k, v] = kv.split('=');
			if ((k === 't' || k === 'start') && v && /^\d+$/.test(v)) return Number(v);
		}
	}
	return undefined;
};

export const extractYouTubeInfo = (input: string): YouTubeRef | null => {
	// already an ID
	if (ID_RE.test(input)) return { id: input };

	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return null;
	}

	// handle redirect-style ?u=<youtube-url>
	const uParam = url.searchParams.get('u');
	if (uParam && !ID_RE.test(uParam)) {
		try {
			const embedded = new URL(uParam, 'https://youtube.com');
			const inner = extractYouTubeInfo(embedded.toString());
			if (inner) {
				// prefer inner start; otherwise inherit outer
				return { id: inner.id, start: inner.start ?? readStartSeconds(url) };
			}
		} catch {
			/* ignore */
		}
	}

	const start = readStartSeconds(url);
	const host = url.hostname.toLowerCase();

	if (host === 'youtu.be') {
		const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
		return ID_RE.test(id) ? { id, start } : null;
	}

	if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
		const v = url.searchParams.get('v');
		if (v && ID_RE.test(v)) return { id: v, start };

		const parts = url.pathname.split('/').filter(Boolean);
		if (parts.length >= 2) {
			const [kind, maybeId] = parts;
			if (['shorts', 'embed', 'v', 'live'].includes(kind) && ID_RE.test(maybeId)) {
				return { id: maybeId, start };
			}
		}
	}

	return null;
};

export const charSchema = z.enum(CHARACTERS);
export const fuseSchema = z.enum(FUSE);

/** ---------- schemas ---------- */

/**
 * Input: { url: string }
 * Output (on success): { externalId: string; url: string; start_time?: number }
 * We validate AND transform in one go.
 */
// export const videoSchema = z
// 	.object({
// 		url: z.url()
// 		// start_time_sec?: z.number() // if you later want to parse a t param, wire it in the transform
// 	})
// 	.transform((x, ctx) => {
// 		const id = extractYouTubeId(x.url);
// 		if (!id) {
// 			ctx.addIssue({
// 				code: 'custom',
// 				message: 'Url did not contain a YouTube video id',
// 				path: ['url']
// 			});
// 			// Signal a hard failure of the transform (keeps the error on the proper path)
// 			return z.NEVER;
// 		}

// 		return {
// 			externalId: id,
// 			url: x.url,
// 			start_time: 0 // TODO: parse start time from the URL if present
// 		};
// 	})
// 	.prefault({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

const getSchemas = (hackyDefaultEnums = false) => {
	// to make super forms not auto pick an enum field we need to chop up the schema a bit
	// https://superforms.rocks/default-values#enums-and-group-inputs

	const defaultEnum = hackyDefaultEnums
		? <EnumVals extends z.util.EnumLike, T extends z.ZodEnum<EnumVals>>(x: T) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return x.default('' as any);
			}
		: <EnumVals extends z.util.EnumLike, T extends z.ZodEnum<EnumVals>>(x: T) => x;

	const teamSchema = z
		.object({
			pointChar: defaultEnum(charSchema),
			assistChar: defaultEnum(charSchema),
			fuse: defaultEnum(fuseSchema),
			charSwapBeforeRound: z.boolean().optional()
		})
		.superRefine((x, ctx) => {
			if (x.pointChar === x.assistChar) {
				ctx.addIssue({
					code: 'custom',
					message: `pointChar and assistChar must be different. Both were (${x.pointChar})`,
					path: ['assistChar'] // point error at one field (adjust if you prefer ['pointChar'])
				});
			}
		});

	const matchSideSchema = z.object({
		team: teamSchema,
		pointPlayerName: z.string().min(1),
		assistPlayerName: z.string().optional()
	});
	const videoSchema = z
		.url()
		.refine((x) => !!extractYouTubeInfo(x), { error: 'Url did not contain a YouTube video id' });

	const matchSchema = z.object({
		video: videoSchema,
		left: matchSideSchema,
		right: matchSideSchema
	});

	return {
		teamSchema,
		matchSideSchema,
		videoSchema,
		matchSchema
	};
};

export const { teamSchema, matchSideSchema, videoSchema, matchSchema } = getSchemas();

export const { matchSchema: uiDefaultedMatchSchema } = getSchemas(true);

/** ---------- Types (optional, for convenience) ---------- */

export type Team = z.infer<typeof teamSchema>;
export type MatchSide = z.infer<typeof matchSideSchema>;
export type Video = z.infer<typeof videoSchema>;
export type Match = z.infer<typeof matchSchema>;

function singleOrArray<T extends z.ZodTypeAny>(inner: T): z.ZodArray<T> {
	return z
		.array(inner)
		.nonempty()
		.or(inner.transform((x) => [x])) as unknown as z.ZodArray<T>;
}

export const matchFilterSchema = z
	.object({
		character: singleOrArray(charSchema),
		limit: z.number(),
		page: z.number(),
		fuse: singleOrArray(fuseSchema),
		player: z.string().nonempty(),
		patch: z.string().nonempty()
	})
	.partial()
	.transform((x) => ({
		...x,
		character: x.character ?? [],
		fuse: x.fuse ?? [],
		player: x.player ?? ''
	}));

export type MatchFilter = z.infer<typeof matchFilterSchema>;
