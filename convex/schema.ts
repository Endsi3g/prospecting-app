import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  users: defineTable({
    authId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_auth_id", ["authId"]),

  companies: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    source: v.optional(v.string()),
    googleMapsUrl: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    enrichmentStatus: v.optional(v.string()),
  }).index("by_organization", ["organizationId"]),

  contacts: defineTable({
    organizationId: v.id("organizations"),
    companyId: v.id("companies"),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    roleConfidence: v.optional(v.number()),
    linkedinUrl: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    source: v.optional(v.string()),
  }).index("by_company", ["companyId"]),

  leads: defineTable({
    organizationId: v.id("organizations"),
    companyId: v.id("companies"),
    contactId: v.optional(v.id("contacts")),
    campaignId: v.optional(v.string()),
    status: v.optional(v.string()),
    fitScore: v.optional(v.number()),
    contactConfidence: v.optional(v.number()),
    personalizationScore: v.optional(v.number()),
    outcomeScore: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  }).index("by_status", ["status"]),

  messages: defineTable({
    organizationId: v.id("organizations"),
    leadId: v.id("leads"),
    campaignId: v.optional(v.string()),
    fromEmail: v.optional(v.string()),
    toEmail: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.optional(v.string()),
    resendId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  }).index("by_lead", ["leadId"]),

  activityLogs: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    action: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_organization", ["organizationId"]),
  
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
