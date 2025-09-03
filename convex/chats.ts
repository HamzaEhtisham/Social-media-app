import { query } from "./_generated/server";
import { v } from "convex/values";

export const getChatDetails = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return null;

    // Get all participants' details
    const participants = await Promise.all(
      chat.participants.map(async (clerkId) => {
        return await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("clerkId"), clerkId))
          .first();
      })
    );

    return {
      ...chat,
      participants: participants.filter(Boolean), // Remove any null values
    };
  },
});
