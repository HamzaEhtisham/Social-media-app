import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Schema for different types of chats (private or group)
export const createChat = mutation({
  args: {
    chatType: v.union(v.literal("private"), v.literal("group")),
    participants: v.array(v.string()),
    chatName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // For private chats, ensure only 2 participants
    if (args.chatType === "private" && args.participants.length !== 1) {
      throw new Error("Private chats must have exactly one other participant");
    }

    // For group chats, ensure chat name
    if (args.chatType === "group" && !args.chatName) {
      throw new Error("Group chats must have a name");
    }

    // Check if private chat already exists
    if (args.chatType === "private") {
      const existingChat = await ctx.db
        .query("chats")
        .filter((q) =>
          q.and(
            q.eq(q.field("chatType"), "private"),
            q.eq(q.field("participants"), [userId, args.participants[0]].sort())
          )
        )
        .first();

      if (existingChat) {
        return existingChat._id;
      }
    }

    // Sort participants for consistency
    const participants = [...new Set([...args.participants, userId])].sort();

    return await ctx.db.insert("chats", {
      chatType: args.chatType,
      participants,
      chatName: args.chatName,
      lastMessageAt: new Date().toISOString(),
    });
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: userId,
      content: args.content,
      createdAt: new Date().toISOString(),
    });
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

    return chats
      .filter((chat) => chat.participants.includes(userId))
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );
  },
});

export const getChatMessages = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("chatId"), args.chatId))
      .order("desc")
      .take(50);
  },
});

export const searchUsers = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const searchTerm = args.searchTerm.toLowerCase();

    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("clerkId"), userId))
      .collect();

    return users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm) ||
          user.fullname.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10);
  },
});
