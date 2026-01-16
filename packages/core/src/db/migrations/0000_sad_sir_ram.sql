CREATE TABLE `beats` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`position` integer NOT NULL,
	`act_number` integer,
	`beat_type` text,
	`visual_description` text NOT NULL,
	`narrative_context` text,
	`emotional_tone` text,
	`character_ids` text DEFAULT '[]' NOT NULL,
	`character_actions` text,
	`camera_angle` text,
	`composition` text,
	`dialogue` text,
	`narration` text,
	`sfx` text,
	`panel_id` text,
	`generated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`panel_id`) REFERENCES `panels`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `beats_story_idx` ON `beats` (`story_id`);--> statement-breakpoint
CREATE INDEX `beats_position_idx` ON `beats` (`story_id`,`position`);--> statement-breakpoint
CREATE INDEX `beats_panel_idx` ON `beats` (`panel_id`);--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`profile` text NOT NULL,
	`prompt_fragments` text NOT NULL,
	`reference_images` text DEFAULT '[]' NOT NULL,
	`lora` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `characters_project_idx` ON `characters` (`project_id`);--> statement-breakpoint
CREATE INDEX `characters_name_idx` ON `characters` (`name`);--> statement-breakpoint
CREATE TABLE `custom_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`character_id` text,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text DEFAULT '',
	`type` text NOT NULL,
	`file_path` text NOT NULL,
	`trigger_word` text NOT NULL,
	`trigger_aliases` text DEFAULT '[]' NOT NULL,
	`default_strength` real DEFAULT 1 NOT NULL,
	`default_clip_strength` real DEFAULT 1,
	`trained_at` integer,
	`base_model` text,
	`training_steps` integer,
	`source_images` text,
	`metadata` text,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `custom_assets_project_idx` ON `custom_assets` (`project_id`);--> statement-breakpoint
CREATE INDEX `custom_assets_character_idx` ON `custom_assets` (`character_id`);--> statement-breakpoint
CREATE INDEX `custom_assets_type_idx` ON `custom_assets` (`type`);--> statement-breakpoint
CREATE TABLE `expression_library` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`reference_path` text NOT NULL,
	`source_generation_id` text,
	`expression_data` text,
	`prompt_fragment` text NOT NULL,
	`intensity` integer DEFAULT 5,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_generation_id`) REFERENCES `generated_images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expression_library_character_idx` ON `expression_library` (`character_id`);--> statement-breakpoint
CREATE INDEX `expression_library_name_idx` ON `expression_library` (`name`);--> statement-breakpoint
CREATE TABLE `generated_images` (
	`id` text PRIMARY KEY NOT NULL,
	`panel_id` text NOT NULL,
	`local_path` text NOT NULL,
	`cloud_url` text,
	`thumbnail_path` text,
	`seed` integer NOT NULL,
	`prompt` text NOT NULL,
	`negative_prompt` text DEFAULT '',
	`model` text NOT NULL,
	`loras` text DEFAULT '[]' NOT NULL,
	`steps` integer NOT NULL,
	`cfg` real NOT NULL,
	`sampler` text NOT NULL,
	`scheduler` text DEFAULT 'normal',
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`variant_strategy` text,
	`variant_index` integer,
	`used_ip_adapter` integer DEFAULT false,
	`ip_adapter_images` text,
	`used_controlnet` integer DEFAULT false,
	`controlnet_type` text,
	`controlnet_image` text,
	`is_selected` integer DEFAULT false,
	`is_favorite` integer DEFAULT false,
	`rating` integer,
	`review_status` text DEFAULT 'pending',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`panel_id`) REFERENCES `panels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generated_images_panel_idx` ON `generated_images` (`panel_id`);--> statement-breakpoint
CREATE INDEX `generated_images_selected_idx` ON `generated_images` (`panel_id`,`is_selected`);--> statement-breakpoint
CREATE INDEX `generated_images_seed_idx` ON `generated_images` (`seed`);--> statement-breakpoint
CREATE INDEX `generated_images_review_status_idx` ON `generated_images` (`review_status`);--> statement-breakpoint
CREATE TABLE `image_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`generated_image_id` text NOT NULL,
	`panel_id` text NOT NULL,
	`score` real NOT NULL,
	`status` text NOT NULL,
	`issues` text,
	`recommendation` text,
	`iteration` integer DEFAULT 1 NOT NULL,
	`previous_review_id` text,
	`reviewed_by` text NOT NULL,
	`human_reviewer_id` text,
	`human_feedback` text,
	`action_taken` text,
	`regenerated_image_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`generated_image_id`) REFERENCES `generated_images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`panel_id`) REFERENCES `panels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `image_reviews_image_idx` ON `image_reviews` (`generated_image_id`);--> statement-breakpoint
CREATE INDEX `image_reviews_panel_idx` ON `image_reviews` (`panel_id`);--> statement-breakpoint
CREATE INDEX `image_reviews_status_idx` ON `image_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `image_reviews_iteration_idx` ON `image_reviews` (`panel_id`,`iteration`);--> statement-breakpoint
CREATE TABLE `interaction_poses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text DEFAULT '',
	`category` text NOT NULL,
	`character_count` integer DEFAULT 2 NOT NULL,
	`pose_definitions` text NOT NULL,
	`reference_images` text DEFAULT '[]' NOT NULL,
	`gligen_boxes` text,
	`prompt_fragment` text NOT NULL,
	`negative_fragment` text DEFAULT '',
	`tags` text DEFAULT '[]' NOT NULL,
	`rating` text NOT NULL,
	`is_builtin` integer DEFAULT false NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interaction_poses_name_unique` ON `interaction_poses` (`name`);--> statement-breakpoint
CREATE INDEX `interaction_poses_category_idx` ON `interaction_poses` (`category`);--> statement-breakpoint
CREATE INDEX `interaction_poses_rating_idx` ON `interaction_poses` (`rating`);--> statement-breakpoint
CREATE TABLE `page_layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`storyboard_id` text NOT NULL,
	`name` text NOT NULL,
	`page_number` integer NOT NULL,
	`layout_config` text NOT NULL,
	`panel_placements` text NOT NULL,
	`rendered_path` text,
	`rendered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`storyboard_id`) REFERENCES `storyboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `panel_captions` (
	`id` text PRIMARY KEY NOT NULL,
	`panel_id` text NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`character_id` text,
	`position` text NOT NULL,
	`tail_direction` text,
	`style` text,
	`z_index` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`beat_id` text,
	`generated_from_beat` integer DEFAULT false NOT NULL,
	`manually_edited` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`panel_id`) REFERENCES `panels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`beat_id`) REFERENCES `beats`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `panel_captions_panel_idx` ON `panel_captions` (`panel_id`);--> statement-breakpoint
CREATE INDEX `panel_captions_type_idx` ON `panel_captions` (`type`);--> statement-breakpoint
CREATE INDEX `panel_captions_beat_idx` ON `panel_captions` (`beat_id`);--> statement-breakpoint
CREATE TABLE `panels` (
	`id` text PRIMARY KEY NOT NULL,
	`storyboard_id` text NOT NULL,
	`position` integer NOT NULL,
	`description` text DEFAULT '',
	`direction` text,
	`character_ids` text DEFAULT '[]' NOT NULL,
	`selected_output_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`storyboard_id`) REFERENCES `storyboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `panels_storyboard_idx` ON `panels` (`storyboard_id`);--> statement-breakpoint
CREATE INDEX `panels_position_idx` ON `panels` (`storyboard_id`,`position`);--> statement-breakpoint
CREATE TABLE `pose_library` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`category` text NOT NULL,
	`skeleton_path` text NOT NULL,
	`source_generation_id` text,
	`pose_data` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_generation_id`) REFERENCES `generated_images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pose_library_project_idx` ON `pose_library` (`project_id`);--> statement-breakpoint
CREATE INDEX `pose_library_category_idx` ON `pose_library` (`category`);--> statement-breakpoint
CREATE TABLE `premises` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`logline` text NOT NULL,
	`genre` text,
	`tone` text,
	`themes` text DEFAULT '[]' NOT NULL,
	`character_ids` text DEFAULT '[]' NOT NULL,
	`setting` text,
	`world_rules` text,
	`generated_by` text,
	`generation_prompt` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `premises_project_idx` ON `premises` (`project_id`);--> statement-breakpoint
CREATE INDEX `premises_status_idx` ON `premises` (`status`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`settings` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_name_idx` ON `projects` (`name`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`premise_id` text NOT NULL,
	`title` text NOT NULL,
	`synopsis` text,
	`target_length` integer,
	`actual_length` integer,
	`structure` text DEFAULT 'three-act' NOT NULL,
	`structure_notes` text,
	`character_arcs` text,
	`generated_by` text,
	`generation_prompt` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`premise_id`) REFERENCES `premises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stories_premise_idx` ON `stories` (`premise_id`);--> statement-breakpoint
CREATE INDEX `stories_status_idx` ON `stories` (`status`);--> statement-breakpoint
CREATE TABLE `storyboards` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`lighting_config` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `storyboards_project_idx` ON `storyboards` (`project_id`);--> statement-breakpoint
CREATE INDEX `storyboards_name_idx` ON `storyboards` (`name`);