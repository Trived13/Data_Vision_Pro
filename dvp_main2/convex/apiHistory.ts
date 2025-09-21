import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveApiRequest = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    method: v.union(v.literal("GET"), v.literal("POST")),
    headers: v.record(v.string(), v.string()),
    body: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    return await ctx.db.insert("apiHistory", {
      userId,
      name: args.name,
      url: args.url,
      method: args.method,
      headers: args.headers,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

export const deleteApiRequest = mutation({
  args: { id: v.id("apiHistory") },
  async handler(ctx, args) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");
    if (request.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
  },
});

export const getUserApiHistory = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return [];

      return await ctx.db
        .query("apiHistory")
        .withIndex("by_user_id", q => q.eq("userId", userId))
        .order("desc")
        .collect();
    } catch (error) {
      console.error('Error in getUserApiHistory:', error);
      return [];
    }
  },
});

export const clearAll = mutation({
  args: {},
  async handler(ctx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const userRequests = await ctx.db
      .query("apiHistory")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .collect();

    // Delete all requests for the user
    await Promise.all(userRequests.map(request => ctx.db.delete(request._id)));
  },
});