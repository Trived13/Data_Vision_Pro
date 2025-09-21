import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  apiHistory: defineTable({
    userId: v.string(),
    name: v.string(),
    url: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    headers: v.record(v.string(), v.string()),
    body: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_date", ["userId", "createdAt"]),
  userProfiles: defineTable({
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    hashedPassword: v.optional(v.string()),
    emailVerified: v.boolean(),
    twoFactorEnabled: v.boolean(),
    twoFactorSecret: v.optional(v.string()),
    lastLogin: v.optional(v.number()),
    loginAttempts: v.number(),
    lockoutUntil: v.optional(v.number()),
    googleId: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_google_id", ["googleId"]),
  
  otpCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
    type: v.union(v.literal("email_verification"), v.literal("two_factor")),
  })
    .index("by_user_id", ["userId"])
    .index("by_code", ["code"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_token", ["token"]),

  dashboards: defineTable({
    name: v.string(),
    endpoint: v.string(),
    refreshInterval: v.number(),
    metrics: v.array(
      v.object({
        name: v.string(),
        path: v.string(),
        type: v.union(
          v.literal("number"),
          v.literal("string"),
          v.literal("boolean")
        ),
        value: v.optional(v.any())
      })
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
    userId: v.id("users"),
    isActive: v.boolean(),
    lastRefreshed: v.optional(v.string())
  })
    .index("by_user_id", ["userId"])
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});