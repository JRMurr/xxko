import { z } from 'zod';
import { CHARACTERS, FUSE } from '$lib/constants';

/** ---------- helpers ---------- */

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export const extractYouTubeId = (input: string): string | null => {
	if (ID_RE.test(input)) return input;

	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return null;
	}

	const uParam = url.searchParams.get('u');
	if (uParam && !ID_RE.test(uParam)) {
		try {
			const embedded = new URL(uParam, 'https://youtube.com');
			const fromEmbedded = extractYouTubeId(embedded.toString());
			if (fromEmbedded) return fromEmbedded;
		} catch {
			/* ignore */
		}
	}

	const host = url.hostname.toLowerCase();

	if (host === 'youtu.be') {
		const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
		return ID_RE.test(id) ? id : null;
	}

	if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
		const v = url.searchParams.get('v');
		if (v && ID_RE.test(v)) return v;

		const parts = url.pathname.split('/').filter(Boolean);
		if (parts.length >= 2) {
			const [kind, maybeId] = parts;
			if (['shorts', 'embed', 'v', 'live'].includes(kind) && ID_RE.test(maybeId)) {
				return maybeId;
			}
		}
	}

	return null;
};

export const charSchema = z.enum(CHARACTERS);
export const fuseSchema = z.enum(FUSE);

/** ---------- schemas ---------- */

export const teamSchema = z
	.object({
		pointChar: charSchema,
		assistChar: charSchema,
		fuse: fuseSchema,
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

export const matchSideSchema = z.object({
	team: teamSchema,
	pointPlayerName: z.string(),
	assistPlayerName: z.string().optional()
});

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

export const videoSchema = z
	.string()
	.refine((x) => !!extractYouTubeId(x), { error: 'Url did not contain a YouTube video id' });

// We need a default value here or the ui will be sad since it will be acting on an undefined on first load (due to the transform)
// .default({
// 	url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
// 	start_time: 0,
// 	externalId: 'dQw4w9WgXcQ'
// });

export const matchSchema = z.object({
	video: videoSchema,
	left: matchSideSchema,
	right: matchSideSchema
});

/** ---------- Types (optional, for convenience) ---------- */

export type Team = z.infer<typeof teamSchema>;
export type MatchSide = z.infer<typeof matchSideSchema>;
export type Video = z.infer<typeof videoSchema>;
export type Match = z.infer<typeof matchSchema>;
