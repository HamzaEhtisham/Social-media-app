import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Create or get existing conversation between two users
export const createOrGetConversation = mutation({
  args: {
    participantId: v.id("users"), // The other user to chat with
  },
  handler: async (ctx, { participantId }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    // Don't allow self-conversation
    if (currentUser._id === participantId) {
      throw new Error("Cannot create conversation with yourself");
    }

    // Check if conversation already exists
    const existingConversation = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("isGroup"), false),
          q.or(
            q.and(
              q.eq(q.arrayContains("participantIds", currentUser._id), true),
              q.eq(q.arrayContains("participantIds", participantId), true)
            )
          )
        )
      )
      .first();

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      participantIds: [currentUser._id, participantId],
      lastMessageTime: Date.now(),
      isGroup: false,
    });

    return conversationId;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.optional(v.string()),
    messageType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio")
    ),
    mediaUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    // Verify user is part of the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.participantIds.includes(currentUser._id)) {
      throw new Error("User not authorized for this conversation");
    }

    // Insert the message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUser._id,
      content: args.content,
      messageType: args.messageType,
      mediaUrl: args.mediaUrl,
      storageId: args.storageId,
      isDeleted: false,
    });

    // Update conversation last message time and ID
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageTime: Date.now(),
    });

    return messageId;
  },
});

// Get all conversations for the current user
export const getUserConversations = query({
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.arrayContains("participantIds", currentUser._id), true))
      .order("by_last_message_time", "desc")
      .collect();

    // Get conversation details with participants and last message
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        // Get other participants
        const participants = await Promise.all(
          conv.participantIds
            .filter((id) => id !== currentUser._id)
            .map(async (id) => await ctx.db.get(id))
        );

        // Get last message
        let lastMessage = null;
        if (conv.lastMessageId) {
          lastMessage = await ctx.db.get(conv.lastMessageId);
          if (lastMessage && !lastMessage.isDeleted) {
            // Get sender info
            const sender = await ctx.db.get(lastMessage.senderId);
            lastMessage = { ...lastMessage, sender };
          }
        }

        // Count unread messages
        const unreadCount = await ctx.db
          .query("messages")
          .filter((q) =>
            q.and(
              q.eq(q.field("conversationId"), conv._id),
              q.neq(q.field("senderId"), currentUser._id),
              q.eq(q.field("isDeleted"), false)
            )
          )
          .collect();

        // Check which messages user has read
        const readMessages = await ctx.db
          .query("messageReadStatus")
          .filter((q) => q.eq(q.field("userId"), currentUser._id))
          .collect();

        const readMessageIds = new Set(readMessages.map(r => r.messageId));
        const unreadMessages = unreadCount.filter(msg => !readMessageIds.has(msg._id));

        return {
          ...conv,
          participants: participants.filter(Boolean),
          lastMessage,
          unreadCount: unreadMessages.length,
        };
      })
    );

    return conversationsWithDetails.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

// Get messages in a conversation
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, limit = 50 }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    // Verify user is part of the conversation
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
      throw new Error("User not authorized for this conversation");
    }

    const messages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("conversationId"), conversationId),
          q.eq(q.field("isDeleted"), false)
        )
      )
      .order("desc")
      .take(limit);

    // Get sender information for each message
    const messagesWithSenders = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        
        // Check if current user has read this message
        const readStatus = await ctx.db
          .query("messageReadStatus")
          .filter((q) =>
            q.and(
              q.eq(q.field("messageId"), message._id),
              q.eq(q.field("userId"), currentUser._id)
            )
          )
          .first();

        return {
          ...message,
          sender,
          isRead: !!readStatus,
        };
      })
    );

    return messagesWithSenders.reverse(); // Return in chronological order
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, { conversationId, messageIds }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    // Verify user is part of the conversation
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
      throw new Error("User not authorized for this conversation");
    }

    // Mark messages as read
    await Promise.all(
      messageIds.map(async (messageId) => {
        // Check if already read
        const existingRead = await ctx.db
          .query("messageReadStatus")
          .filter((q) =>
            q.and(
              q.eq(q.field("messageId"), messageId),
              q.eq(q.field("userId"), currentUser._id)
            )
          )
          .first();

        if (!existingRead) {
          await ctx.db.insert("messageReadStatus", {
            messageId,
            userId: currentUser._id,
            readAt: Date.now(),
          });
        }
      })
    );

    return { success: true };
  },
});

// Update typing indicator
export const updateTypingStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, { conversationId, isTyping }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    // Verify user is part of the conversation
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
      throw new Error("User not authorized for this conversation");
    }

    // Find existing typing indicator
    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .filter((q) =>
        q.and(
          q.eq(q.field("conversationId"), conversationId),
          q.eq(q.field("userId"), currentUser._id)
        )
      )
      .first();

    if (existingIndicator) {
      await ctx.db.patch(existingIndicator._id, {
        isTyping,
        lastTypingTime: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId,
        userId: currentUser._id,
        isTyping,
        lastTypingTime: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get typing users in a conversation
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { conversationId }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return [];

    // Get typing indicators from last 5 seconds
    const fiveSecondsAgo = Date.now() - 5000;
    
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .filter((q) =>
        q.and(
          q.eq(q.field("conversationId"), conversationId),
          q.eq(q.field("isTyping"), true),
          q.gt(q.field("lastTypingTime"), fiveSecondsAgo),
          q.neq(q.field("userId"), currentUser._id) // Exclude current user
        )
      )
      .collect();

    // Get user details for typing users
    const typingUsers = await Promise.all(
      typingIndicators.map(async (indicator) => {
        const user = await ctx.db.get(indicator.userId);
        return user;
      })
    );

    return typingUsers.filter(Boolean);
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    // Only sender can delete their own message
    if (message.senderId !== currentUser._id) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.patch(messageId, { isDeleted: true });

    // If this was a media message, we could also delete the storage file
    if (message.storageId) {
      await ctx.storage.delete(message.storageId);
    }

    return { success: true };
  },
});

// Search for users to start a conversation with
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, { searchTerm }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("User not authenticated");

    if (searchTerm.length < 2) return [];

    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.or(
            q.contains(q.field("username"), searchTerm.toLowerCase()),
            q.contains(q.field("fullname"), searchTerm.toLowerCase())
          ),
          q.neq(q.field("_id"), currentUser._id) // Exclude current user
        )
      )
      .take(20);

    return users;
  },
});
