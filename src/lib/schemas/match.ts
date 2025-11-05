import { type } from 'arktype';
import { CHARACTERS, FUSE } from '$lib/constants';

export const charSchema = type.enumerated(...CHARACTERS);
export const fuseSchema = type.enumerated(...FUSE);

export const teamSchema = type({
	pointChar: charSchema,
	assistChar: charSchema,
	fuse: fuseSchema,
	charSwapBeforeRound: 'boolean = false'
}).narrow((x, ctx) => {
	if (x.pointChar === x.assistChar) {
		return ctx.reject({
			problem: `pointChar and assistChar must be different. Both where (${x.pointChar})`
		});
	}

	return true;
});

export const matchSideSchema = type({
	team: teamSchema,
	pointPlayerName: 'string',
	'assistPlayerName?': 'string'
});

export const extractYouTubeId = (input: string): string | null => {
	// If they passed an ID directly, accept it.
	if (ID_RE.test(input)) return input;

	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return null; // not a URL and not an ID
	}

	// Some shares use an attribution link that embeds /watch?v=... inside `u=...`
	// Example: https://www.youtube.com/attribution_link?u=/watch%3Fv%3DVIDEOID
	const uParam = url.searchParams.get('u');
	if (uParam && !ID_RE.test(uParam)) {
		try {
			// `u` might be a relative path; coerce to a full URL to re-parse
			const embedded = new URL(uParam, 'https://youtube.com');
			const fromEmbedded = extractYouTubeId(embedded.toString());
			if (fromEmbedded) return fromEmbedded;
		} catch {
			/* ignore */
		}
	}

	const host = url.hostname.toLowerCase();

	// youtu.be/<id>
	if (host === 'youtu.be') {
		const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
		return ID_RE.test(id) ? id : null;
	}

	// *.youtube.com (www, m, music, etc.)
	if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
		// Standard watch URLs: ?v=<id>
		const v = url.searchParams.get('v');
		if (v && ID_RE.test(v)) return v;

		// Handle common path variants: /shorts/<id>, /embed/<id>, /v/<id>, /live/<id>
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

const videoSchema = type({
	url: 'string', // TODO: make sure its a valid youtube/twitch link
	'start_time_sec?': 'number'
}).pipe.try(
	(x, ctx) => {
		const id = extractYouTubeId(x.url);
		if (!id) {
			return ctx.error({ message: 'Url did not contain a youtube video id', path: ['url'] });
		}

		return {
			externalId: id,
			url: x.url
			// TODO: parse start time from url
		};
	},
	type({
		externalId: 'string',
		url: 'string',
		'start_time?': 'number'
	})
);

export const matchSchema = type({
	video: videoSchema,
	left: matchSideSchema,
	right: matchSideSchema
});

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;
