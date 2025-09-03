import { query } from "./_generated/server";
import { v } from "convex/values";

export const searchUsers = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("clerkId"), userId))
      .collect();

    const searchTerm = args.searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm) ||
        user.fullname.toLowerCase().includes(searchTerm)
    );
  },
});

export const getChats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const chats = await ctx.db.query("chats").collect();

    // Get all chats where user is a participant
    const userChats = chats.filter((chat) =>
      chat.participants.includes(userId)
    );

    // Get all participants' details
    const chatsWithParticipants = await Promise.all(
      userChats.map(async (chat) => {
        const participants = await Promise.all(
          chat.participants.map(async (participantId) => {
            const user = await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("clerkId"), participantId))
              .first();
            return user;
          })
        );

        return {
          ...chat,
          participants: participants.filter(Boolean),
        };
      })
    );

    return chatsWithParticipants.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    );
  },
});
