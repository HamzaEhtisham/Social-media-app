import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(), //johndoe
    fullname: v.string(), // John Doe
    email: v.string(),
    bio: v.optional(v.string()),
    image: v.string(),
    followers: v.float64(),
    following: v.float64(),
    posts: v.float64(),
    clerkId: v.string(),
  })
    .index("by_clerk_id", { fields: ["clerkId"] })
    .searchIndex("search_by_name", {
      searchField: "fullname",
      filterFields: ["username"],
    }),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"), // will be needed when we want to delete a post
    caption: v.optional(v.string()),
    likes: v.float64(),
    comments: v.float64(),
  }).index("by_user", { fields: ["userId"] }),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", { fields: ["postId"] })
    .index("by_user_and_post", { fields: ["userId", "postId"] }),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  }).index("by_post", { fields: ["postId"] }),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", { fields: ["followerId"] })
    .index("by_following", { fields: ["followingId"] })
    .index("by_both", { fields: ["followerId", "followingId"] }),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("message")
    ),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  }).index("by_receiver", { fields: ["receiverId"] }),

  chats: defineTable({
    chatType: v.string(), // "private" or "group"
    participants: v.array(v.string()), // array of clerk user IDs
    chatName: v.optional(v.string()), // for group chats
    lastMessageAt: v.string(),
  }).index("by_participants", ["participants"]),

  messages: defineTable({
    chatId: v.id("chats"),
    senderId: v.string(), // clerk user ID
    content: v.string(),
    createdAt: v.string(),
  }).index("by_chat", { fields: ["chatId"] }),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", { fields: ["userId"] })
    .index("by_post", { fields: ["postId"] })
    .index("by_user_and_post", { fields: ["userId", "postId"] }),

  stories: defineTable({
    userId: v.id("users"),
    imageUrl: v.optional(v.string()), // for backward compatibility
    mediaUrl: v.optional(v.string()), // existing field
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.optional(v.float64()), // make optional for existing data
    views: v.optional(v.float64()), // make optional for existing data
    viewers: v.optional(v.float64()), // existing field
    createdAt: v.optional(v.float64()), // make optional for existing data
    expiresAt: v.float64(), // timestamp (24 hours later)
    mediaType: v.optional(v.string()), // existing field
  }).index("by_user", ["userId"]),

  storyLikes: defineTable({
    userId: v.id("users"),
    storyId: v.id("stories"),
  })
    .index("by_story", ["storyId"])
    .index("by_user_and_story", ["userId", "storyId"]),
});
