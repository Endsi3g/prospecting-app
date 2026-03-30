import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("activityLogs").order("desc").take(50);
  },
});

export const log = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()), // uuid representation
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    let org = await ctx.db.query("organizations").first();
    if (!org) {
      const orgId = await ctx.db.insert("organizations", {
        name: "Uprising Studio",
        slug: "uprising-studio",
        plan: "free"
      });
      org = await ctx.db.get(orgId);
    }

    return await ctx.db.insert("activityLogs", {
      organizationId: org!._id,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      metadata: args.metadata,
    });
  },
});
