CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `match` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` integer NOT NULL,
	`start_sec` integer NOT NULL,
	`end_sec` integer,
	`left_side_id` integer NOT NULL,
	`right_side_id` integer NOT NULL,
	`title` text,
	`context` text,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	`patch` text,
	`notes` text,
	FOREIGN KEY (`video_id`) REFERENCES `video_source`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`left_side_id`) REFERENCES `match_side`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`right_side_id`) REFERENCES `match_side`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_context" CHECK("match"."context" IN ('ranked', 'casual', 'tournament'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_match_video_start` ON `match` (`video_id`,`start_sec`);--> statement-breakpoint
CREATE TABLE `match_side` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_side_team` ON `match_side` (`team_id`);--> statement-breakpoint
CREATE TABLE `match_side_player` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`side_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`side_id`) REFERENCES `match_side`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_role_enum" CHECK("match_side_player"."role" IN ('point', 'assist'))
);
--> statement-breakpoint
CREATE INDEX `idx_side_player_side` ON `match_side_player` (`side_id`);--> statement-breakpoint
CREATE INDEX `idx_side_player_player` ON `match_side_player` (`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_side_role` ON `match_side_player` (`side_id`,`role`);--> statement-breakpoint
CREATE TABLE `player` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_name_unique` ON `player` (`name`);--> statement-breakpoint
CREATE TABLE `team` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`point_char` text NOT NULL,
	`assist_char` text NOT NULL,
	`fuse` text NOT NULL,
	`char_swap_before_round` integer,
	CONSTRAINT "chk_fuse" CHECK("team"."fuse" IN ('juggernaut', 'sidekick', '2xAssist', 'DoubleDown', 'Freestyle'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_team_pair` ON `team` (`point_char`,`assist_char`,`fuse`,`char_swap_before_round`);--> statement-breakpoint
CREATE INDEX `idx_point` ON `team` (`point_char`);--> statement-breakpoint
CREATE INDEX `idx_assist` ON `team` (`point_char`);--> statement-breakpoint
CREATE INDEX `idx_team_chars` ON `team` (`point_char`,`assist_char`);--> statement-breakpoint
CREATE TABLE `video_source` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	CONSTRAINT "chk_platform" CHECK("video_source"."platform" IN ('youtube', 'twitch'))
);
--> statement-breakpoint
CREATE INDEX `idx_video_platform` ON `video_source` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_video_external` ON `video_source` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_platform_external` ON `video_source` (`platform`,`external_id`);