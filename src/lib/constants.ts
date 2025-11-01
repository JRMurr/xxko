export const MATCH_SIDE = ['left', 'right'] as const;
export type MatchSide = (typeof MATCH_SIDE)[number];

export const FUSE = ['juggernaut', 'sidekick'] as const;
export type Fuse = (typeof FUSE)[number];

export const VIDEO_PLATFORM = ['youtube', 'twitch'] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORM)[number];

export const MATCH_CONTEXT = ['ranked', 'casual', 'tournament'] as const;
export type MatchContext = (typeof MATCH_CONTEXT)[number];
