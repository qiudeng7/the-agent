-- The Agent 数据库迁移
-- 合并所有迁移 SQL，用于 D1 一次性部署
-- 执行命令：wrangler d1 execute the-agent-db --remote --file=./db/migrations/all.sql

-- ============================================
-- Migration 0000: 初始表结构
-- ============================================

-- 用户表（无外键依赖，先创建）
CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `nickname` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

-- 聊天会话表（依赖 users）
CREATE TABLE `chat_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `model` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 消息表（依赖 chat_sessions）
CREATE TABLE `messages` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text NOT NULL,
  `model` text,
  `timestamp` integer NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 用户设置表（依赖 users）
CREATE TABLE `user_settings` (
  `user_id` text PRIMARY KEY NOT NULL,
  `language` text DEFAULT 'system' NOT NULL,
  `theme` text DEFAULT 'system' NOT NULL,
  `custom_model_configs` text,
  `enabled_models` text,
  `default_model` text,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- ============================================
-- Migration 0001: 任务表和字段扩展
-- ============================================

-- 任务表（依赖 users）
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

-- 为 chat_sessions 添加 task_id 字段
ALTER TABLE `chat_sessions` ADD `task_id` integer REFERENCES tasks(id);

-- 为 users 添加 role 字段
ALTER TABLE `users` ADD `role` text DEFAULT 'employee' NOT NULL;

-- 为 users 添加 deleted_at 字段
ALTER TABLE `users` ADD `deleted_at` integer;