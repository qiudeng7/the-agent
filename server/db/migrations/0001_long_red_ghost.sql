CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`tag` text,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`assigned_to_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD `task_id` integer REFERENCES tasks(id);--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'employee' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;