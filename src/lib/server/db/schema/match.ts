import { relations, sql } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex, index, check } from 'drizzle-orm/sqlite-core';
import {
	VIDEO_PLATFORM,
	MATCH_CONTEXT,
	MATCH_SIDE,
	FUSE,
	PLAYER_ROLE,
	CHARACTERS
} from '../../../constants';
import { join_with_comma } from '../utils';

export const player = sqliteTable('player', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

export const team = sqliteTable(
	'team',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		pointChar: text('point_char', { enum: CHARACTERS }).notNull(),
		assistChar: text('assist_char', { enum: CHARACTERS }).notNull(),
		fuse: text('fuse', { enum: FUSE }).notNull(),

		// If before a round start did the chars swap (mostly matters if jug/sidekick)
		charSwapBeforeRound: integer('char_swap_before_round', { mode: 'boolean' })
	},
	(t) => [
		uniqueIndex('uq_team_pair').on(t.pointChar, t.assistChar, t.fuse, t.charSwapBeforeRound),
		index('idx_point').on(t.pointChar),
		index('idx_assist').on(t.pointChar),
		index('idx_team_chars').on(t.pointChar, t.assistChar),
		check('chk_fuse', sql`${t.fuse} IN (${join_with_comma(FUSE)})`)
		// // Force a consistent ordering on how to insert chars to avoid dupes by permutation
		// check('chk_team_order', sql`${t.char1Id} < ${t.char2Id}`)
	]
);

export const videoSource = sqliteTable(
	'video_source',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		platform: text('platform', { enum: VIDEO_PLATFORM }).notNull(),
		externalId: text('external_id'), // id of the video (ie the slug), used mostly for de-dupe so if the link is slightly diff the id would still match
		url: text('url').notNull() // full url for the video
		// channel: text("channel"),
		// uploadedAt: text("uploaded_at"),
	},
	(t) => [
		check('chk_platform', sql`${t.platform} IN (${join_with_comma(VIDEO_PLATFORM)})`),
		index('idx_video_platform').on(t.platform),
		index('idx_video_external').on(t.externalId),
		uniqueIndex('uq_platform_external').on(t.platform, t.externalId)
	]
);

export const match = sqliteTable(
	'match',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		videoId: integer('video_id')
			.notNull()
			.references(() => videoSource.id),
		startSec: integer('start_sec').notNull(),
		endSec: integer('end_sec'),
		title: text('title'),
		context: text('context', { enum: MATCH_CONTEXT }),
		patch: text('patch'),
		notes: text('notes')
	},
	(t) => [
		uniqueIndex('uq_match_video_start').on(t.videoId, t.startSec),
		check('chk_context', sql`${t.context} IN (${join_with_comma(MATCH_CONTEXT)})`)
	]
);

export const matchSide = sqliteTable(
	'match_side',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		matchId: integer('match_id')
			.notNull()
			.references(() => match.id, { onDelete: 'cascade' }),
		side: text('side', { enum: MATCH_SIDE }).notNull(),

		teamId: integer('team_id')
			.notNull()
			.references(() => team.id)
	},
	(t) => [
		uniqueIndex('uq_match_side').on(t.matchId, t.side),
		index('idx_side_match').on(t.matchId),
		index('idx_side_team').on(t.teamId),

		check('chk_side', sql`${t.side} IN (${join_with_comma(MATCH_SIDE)})`)
	]
);

// Upto 2 of these rows per side (2 if theres a duo)
export const matchSidePlayer = sqliteTable(
	'match_side_player',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		sideId: integer('side_id')
			.notNull()
			.references(() => matchSide.id, { onDelete: 'cascade' }),
		playerId: integer('player_id')
			.notNull()
			.references(() => player.id),
		role: text('role', { enum: PLAYER_ROLE }).notNull()
	},
	(t) => [
		index('idx_side_player_side').on(t.sideId),
		index('idx_side_player_player').on(t.playerId),
		uniqueIndex('uq_side_role').on(t.sideId, t.role),

		// TODO: this may or not may not be a good idea
		// // no double-picking the same character on a side
		// uniqueIndex('uq_side_char_once').on(t.sideId, t.controlledCharId),

		// check('chk_is_point_bool', sql`${t.isPoint} IN (0,1)`),
		check('chk_role_enum', sql`${t.role} IN (${join_with_comma(PLAYER_ROLE)})`)

		// TODO: check to make sure the controlledCharId is in the team?
	]
);

// export const matchCompetitor = sqliteTable(
// 	'match_competitor',
// 	{
// 		id: integer('id').primaryKey({ autoIncrement: true }),

// 		matchId: integer('match_id')
// 			.notNull()
// 			.references(() => match.id, { onDelete: 'cascade' }),

// 		side: text('side', { enum: MATCH_SIDE }).notNull(),

// 		// Primary player (always present)
// 		playerId: integer('player_id')
// 			.notNull()
// 			.references(() => player.id),

// 		// Optional second player for duo control
// 		coPlayerId: integer('co_player_id').references(() => player.id),

// 		// Who started on point (must be one of playerId/coPlayerId if provided)
// 		pointPlayerId: integer('point_player_id').references(() => player.id),

// 		// Team used
// 		teamId: integer('team_id')
// 			.notNull()
// 			.references(() => team.id),

// 		// Who started on point character-wise (nullable if unknown)
// 		leadCharId: integer('lead_char_id').references(() => character.id)
// 	},
// 	(t) => [
// 		uniqueIndex('uq_match_side').on(t.matchId, t.side),

// 		index('idx_comp_match').on(t.matchId),
// 		index('idx_comp_player').on(t.playerId),
// 		index('idx_comp_co_player').on(t.coPlayerId),
// 		index('idx_comp_point_player').on(t.pointPlayerId),
// 		index('idx_comp_team').on(t.teamId),

// 		check('chk_side', sql`${t.side} IN (${join_with_comma(MATCH_SIDE)})`),

// 		// duo integrity
// 		check('chk_duo_distinct', sql`${t.coPlayerId} IS NULL OR ${t.coPlayerId} <> ${t.playerId}`),
// 		check(
// 			'chk_point_member',
// 			sql`${t.pointPlayerId} IS NULL OR ${t.pointPlayerId} IN (${t.playerId}, ${t.coPlayerId})`
// 		)
// 	]
// );
