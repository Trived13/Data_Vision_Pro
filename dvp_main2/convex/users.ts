import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    return {
      ...user,
      profile,
    };
  },
});

export const createUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    hashedPassword: v.optional(v.string()),
    googleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      return existingProfile._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId,
      firstName: args.firstName,
      lastName: args.lastName,
      hashedPassword: args.hashedPassword,
      emailVerified: false,
      twoFactorEnabled: false,
      loginAttempts: 0,
      googleId: args.googleId,
    });
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    twoFactorEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      twoFactorEnabled: args.twoFactorEnabled,
    });

    return profile._id;
  },
});

export const recordLoginAttempt = mutation({
  args: {
    email: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (!profile) {
      return;
    }

    if (args.success) {
      await ctx.db.patch(profile._id, {
        loginAttempts: 0,
        lockoutUntil: undefined,
        lastLogin: Date.now(),
      });
    } else {
      const newAttempts = profile.loginAttempts + 1;
      const lockoutUntil = newAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : undefined; // 15 minutes lockout

      await ctx.db.patch(profile._id, {
        loginAttempts: newAttempts,
        lockoutUntil,
      });
    }
  },
});

export const isAccountLocked = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return false;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    if (!profile || !profile.lockoutUntil) {
      return false;
    }

    return profile.lockoutUntil > Date.now();
  },
});
