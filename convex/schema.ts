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
  }).index("by_clerk_id", ["clerkId"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"), // will be needed when we want to delete a post
    caption: v.optional(v.string()),
    likes: v.float64(),
    comments: v.float64(),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  }).index("by_post", ["postId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  })
    .index("by_receiver", ["receiverId"])
    .index("by_post", ["postId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

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
