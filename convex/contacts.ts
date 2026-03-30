import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contacts").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    fullName: v.string(),
    companyName: v.string(), // We'll link to company later, but for now store simple
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get or create a default organization if none exists
    let org = await ctx.db.query("organizations").first();
    if (!org) {
      const orgId = await ctx.db.insert("organizations", {
        name: "Uprising Studio",
        slug: "uprising-studio",
        plan: "free"
      });
      org = await ctx.db.get(orgId);
    }

    // 2. Get or create company
    let company = await ctx.db.query("companies")
      .withIndex("by_organization", q => q.eq("organizationId", org!._id))
      .filter(q => q.eq(q.field("name"), args.companyName))
      .first();
    
    if (!company) {
       const companyId = await ctx.db.insert("companies", {
         organizationId: org!._id,
         name: args.companyName,
         enrichmentStatus: "pending"
       });
       company = await ctx.db.get(companyId);
    }

    // 3. Insert contact
    const contactId = await ctx.db.insert("contacts", {
      organizationId: org!._id,
      companyId: company!._id,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      roleTitle: args.roleTitle,
      source: "Manual",
    });

    // 4. Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: org!._id,
      entityType: "contact",
      entityId: contactId,
      action: "created",
      metadata: { name: args.fullName }
    });

    return contactId;
  },
});
