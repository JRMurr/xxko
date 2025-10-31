// drizzle/schema.ts
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/sqlite-core";

/* ---------------- shared enum-likes ---------------- */

export const MATCH_SIDE = ['left', 'right'] as const;
export type MatchSide = (typeof MATCH_SIDE)[number];

export const FUSE = ['juggernaut', 'sidekick'] as const;
export type Fuse = (typeof FUSE)[number];


export const VIDEO_PLATFORM = ['youtube', 'twitch'] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORM)[number];

export const MATCH_CONTEXT = ['ranked', 'casual', 'tournament'] as const;
export type MatchContext = (typeof MATCH_CONTEXT)[number];

const join_with_comma = (vals: readonly string[]) => {
  return sql.join(vals.map(x => sql`${x}`), sql`, `)
}

/* ---------------- players ---------------- */

export const player = sqliteTable(
  "player",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name"),
    region: text("region"),
  }
);

/* ---------------- characters (slug only) ---------------- */

export const character = sqliteTable(
  "character",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull().unique(), // e.g. "ekko", "vi"
  }
);

/* ---------------- teams (unordered pair; canonicalized) ---------------- */

export const team = sqliteTable(
  "team",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    char1Id: integer("char1_id").notNull().references(() => character.id),
    char2Id: integer("char2_id").notNull().references(() => character.id),
  },
  (t) => [
    uniqueIndex("uq_team_pair").on(t.char1Id, t.char2Id),
    index("idx_team_chars").on(t.char1Id, t.char2Id),
    check("chk_team_order", sql`${t.char1Id} < ${t.char2Id}`),
  ]
);

/* ---------------- video sources (normalize VODs) ---------------- */

export const videoSource = sqliteTable(
  "video_source",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    platform: text("platform", {enum: VIDEO_PLATFORM}).notNull(),
    externalId: text("external_id"), // id of the video (ie the slug), used mostly for de-dupe so if the link is slightly diff the id would still match
    url: text("url").notNull(), // full url for the video
    // channel: text("channel"),
    // uploadedAt: text("uploaded_at"),
  },
  (t) => [
    check("chk_platform", sql`${t.platform} IN (${join_with_comma(VIDEO_PLATFORM)})`),
    index("idx_video_platform").on(t.platform),
    index("idx_video_external").on(t.externalId),
    uniqueIndex("uq_platform_external").on(t.platform, t.externalId),
  ]
);

/* ---------------- optional series/sets (best-of grouping) ---------------- */

// export const series = sqliteTable(
//   "series",
//   {
//     id: integer("id").primaryKey({ autoIncrement: true }),
//     eventId: integer("event_id"),
//     round: text("round"),
//     bestOf: integer("best_of"),
//     notes: text("notes"),
//   }
// );

/* ---------------- single match (one game w/ VOD timestamp) ---------------- */

export const match = sqliteTable(
  "match",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    videoId: integer("video_id").notNull().references(() => videoSource.id),
    tStartSec: integer("t_start_sec").notNull(),
    tEndSec: integer("t_end_sec"),
    title: text("title"),
    // seriesId: integer("series_id").references(() => series.id),
    context: text("context", {enum: MATCH_CONTEXT}),
    patch: text("patch"),
    notes: text("notes"),
  },
  (t) => [
    index("idx_match_video_time").on(t.videoId, t.tStartSec),
    uniqueIndex("uq_match_video_start").on(t.videoId, t.tStartSec),
    check("chk_context", sql`${t.context} IN (${join_with_comma(MATCH_CONTEXT)})`),
  ]
);

/* ---------------- competitors per match side (supports duos) ----------------
   - no result/score tracking
   - `side` and `fuse` use enum + checks derived from constants
--------------------------------------------------------------------------- */

export const matchCompetitor = sqliteTable(
  "match_competitor",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    matchId: integer("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),

    side: text("side", { enum: MATCH_SIDE }).notNull(),

    // Primary player (always present)
    playerId: integer("player_id").notNull().references(() => player.id),

    // Optional second player for duo control
    coPlayerId: integer("co_player_id").references(() => player.id),

    // Who started on point (must be one of playerId/coPlayerId if provided)
    pointPlayerId: integer("point_player_id").references(() => player.id),

    // Team used
    teamId: integer("team_id").notNull().references(() => team.id),

    // Who started on point character-wise (nullable if unknown)
    leadCharId: integer("lead_char_id").references(() => character.id),

    // Fuse at match start
    fuse: text("fuse", { enum: FUSE }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_match_side").on(t.matchId, t.side),

    index("idx_comp_match").on(t.matchId),
    index("idx_comp_player").on(t.playerId),
    index("idx_comp_co_player").on(t.coPlayerId),
    index("idx_comp_point_player").on(t.pointPlayerId),
    index("idx_comp_team").on(t.teamId),
    index("idx_comp_team_fuse").on(t.teamId, t.fuse),
    index("idx_comp_player_fuse").on(t.playerId, t.fuse),

    check("chk_side", sql`${t.side} IN (${join_with_comma(MATCH_SIDE)})`),
    check("chk_fuse", sql`${t.fuse} IN (${join_with_comma(FUSE)})`),

    // duo integrity
    check("chk_duo_distinct", sql`${t.coPlayerId} IS NULL OR ${t.coPlayerId} <> ${t.playerId}`),
    check(
      "chk_point_member",
      sql`${t.pointPlayerId} IS NULL OR ${t.pointPlayerId} IN (${t.playerId}, ${t.coPlayerId})`
    ),
  ]
);

/* ---------------- helpers ---------------- */

export function canonicalTeamIds(a: number, b: number) {
  if (a === b) throw new Error("A team must have two different characters");
  return a < b ? { char1Id: a, char2Id: b } : { char1Id: b, char2Id: a };
}
