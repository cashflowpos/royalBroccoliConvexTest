import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.todoComponent.functions.list, {});
  },
});

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.todoComponent.functions.create, {
      text: args.text,
    });
  },
});

export const toggle = mutation({
  // Accept string since main app doesn't have schema - component will validate
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Pass the ID to component function which will validate it as v.id("todos")
    return await ctx.runMutation(components.todoComponent.functions.toggle, {
      id: args.id as Id<"todos">,
    });
  },
});

export const remove = mutation({
  // Accept string since main app doesn't have schema - component will validate
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Pass the ID to component function which will validate it as v.id("todos")
    return await ctx.runMutation(components.todoComponent.functions.remove, {
      id: args.id as Id<"todos">,
    });
  },
});

