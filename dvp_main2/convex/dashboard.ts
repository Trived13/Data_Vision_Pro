import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveConfig = mutation({
  args: {
    name: v.string(),
    endpoint: v.string(),
    refreshInterval: v.number(),
    metrics: v.array(
      v.object({
        name: v.string(),
        path: v.string(),
        type: v.union(v.literal("number"), v.literal("string"), v.literal("boolean"))
      })
    )
  },
  handler: async (ctx, args) => {
    const { name, endpoint, refreshInterval, metrics } = args;
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user's internal ID using filter instead of withIndex
    const user = await ctx.db
      .query("users")
    //   .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("dashboards", {
      name,
      endpoint,
      refreshInterval,
      metrics,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user._id,
      isActive: true,
      lastRefreshed: new Date().toISOString()
    });
  }
});