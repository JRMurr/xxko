export const CHARACTERS = [
	'Ahri',
	'Blitzcrank',
	'Braum',
	'Darius',
	'Ekko',
	'Illaoi',
	'Jinx',
	'Teemo',
	'Vi',
	'Warwick',
	'Yasuo'
] as const;
export type Characters = (typeof CHARACTERS)[number];

export const MATCH_SIDE = ['left', 'right'] as const;
export type MatchSide = (typeof MATCH_SIDE)[number];

export const FUSE = ['juggernaut', 'sidekick'] as const;
export type Fuse = (typeof FUSE)[number];

export const VIDEO_PLATFORM = ['youtube', 'twitch'] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORM)[number];

export const MATCH_CONTEXT = ['ranked', 'casual', 'tournament'] as const;
export type MatchContext = (typeof MATCH_CONTEXT)[number];

// For duos who was on point vs assist char
export const PLAYER_ROLE = ['point', 'assist'] as const;
export type PlayerRole = (typeof PLAYER_ROLE)[number];
