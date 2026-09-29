import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const vkSessionsTable = pgTable("vk_sessions", {
  id: text("id").primaryKey(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  userId: integer("user_id").notNull(),
  profileName: text("profile_name").notNull(),
  profileAvatarUrl: text("profile_avatar_url"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type VkSession = typeof vkSessionsTable.$inferSelect;