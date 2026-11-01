import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table linked with Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  defaultLanguage: text('default_language').default('typescript'),
  apiKey: text('api_key'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Workspaces for team collaboration
export const workspaces = pgTable('workspaces', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ownerUid: text('owner_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Workspace members with RBAC roles (admin, reviewer, developer)
export const workspaceMembers = pgTable('workspace_members', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id')
    .references(() => workspaces.id)
    .notNull(),
  userUid: text('user_uid').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('developer'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Custom review guidelines/rules
export const customRules = pgTable('custom_rules', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').references(() => workspaces.id),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  promptDirective: text('prompt_directive').notNull(),
  category: text('category').default('general'),
  isEnabled: boolean('is_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Code reviews history and results
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  workspaceId: integer('workspace_id').references(() => workspaces.id),
  title: text('title').notNull(),
  language: text('language').notNull(),
  inputMethod: text('input_method').notNull(), // 'snippet' | 'upload' | 'repo' | 'multi_file'
  filesJson: text('files_json').notNull(), // JSON string: [{ name, content, language }]
  summary: text('summary'),
  healthScore: integer('health_score').default(85),
  criticalCount: integer('critical_count').default(0),
  highCount: integer('high_count').default(0),
  mediumCount: integer('medium_count').default(0),
  lowCount: integer('low_count').default(0),
  findingsJson: text('findings_json').notNull(), // JSON string: array of findings
  optimizedCode: text('optimized_code'),
  isBookmarked: boolean('is_bookmarked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Real-time chat messages for specific review
export const reviewChatMessages = pgTable('review_chat_messages', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id')
    .references(() => reviews.id)
    .notNull(),
  sender: text('sender').notNull(), // 'user' | 'assistant'
  userUid: text('user_uid'),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// In-app notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'), // 'info' | 'warning' | 'alert' | 'success'
  link: text('link'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  reviews: many(reviews),
  rules: many(customRules),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [reviews.workspaceId],
    references: [workspaces.id],
  }),
  chatMessages: many(reviewChatMessages),
}));

export const reviewChatMessagesRelations = relations(reviewChatMessages, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewChatMessages.reviewId],
    references: [reviews.id],
  }),
}));
