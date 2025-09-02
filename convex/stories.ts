import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});

export const createStory = mutation({
  args: {
    caption: v.optional(v.string()),
    storageId: v.id("_storage"),
    mediaType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("Image not found");

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now

    // create story
    const storyId = await ctx.db.insert("stories", {
      userId: currentUser._id,
      imageUrl: args.mediaType === "image" ? imageUrl : undefined,
      mediaUrl: args.mediaType === "video" ? imageUrl : undefined,
      storageId: args.storageId,
      caption: args.caption,
      likes: 0,
      views: 0,
      createdAt: now,
      expiresAt,
      mediaType: args.mediaType,
    });

    return storyId;
  },
});

export const getAllStories = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // get all active stories (not expired)
    const now = Date.now();
    const stories = await ctx.db
      .query("stories")
      .filter((q) => q.gte(q.field("expiresAt"), now))
      .collect();

    if (stories.length === 0) return [];

    // group stories by user
    const storiesByUser = new Map();

    for (const story of stories) {
      const userId = story.userId;
      if (!storiesByUser.has(userId)) {
        const user = await ctx.db.get(userId);
        if (user) {
          storiesByUser.set(userId, {
            user: {
              _id: user._id,
              username: user.username,
              image: user.image,
            },
            stories: [],
          });
        }
      }
      if (storiesByUser.has(userId)) {
        // Check if current user liked this story
        const like = await ctx.db
          .query("storyLikes")
          .withIndex("by_user_and_story", (q) =>
            q.eq("userId", currentUser._id).eq("storyId", story._id)
          )
          .first();

        // Normalize the story data for backward compatibility
        const normalizedStory = {
          ...story,
          imageUrl: story.imageUrl || story.mediaUrl, // use mediaUrl if imageUrl is not available
          likes: story.likes || 0,
          views: story.views || story.viewers || 0, // handle both views and viewers fields
          createdAt: story.createdAt || Date.now(), // provide default if missing
          mediaType: story.mediaType || "image", // default to image
          isLiked: !!like,
        } as any;
        storiesByUser.get(userId).stories.push(normalizedStory);
      }
    }

    return Array.from(storiesByUser.values());
  },
});

export const getUserStories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("expiresAt"), now))
      .collect();

    return stories;
  },
});

export const deleteStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    console.log("deleteStory called with storyId:", args.storyId);
    const currentUser = await getAuthenticatedUser(ctx);
    console.log("currentUser:", currentUser);

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // verify ownership
    if (story.userId !== currentUser._id)
      throw new Error("Not authorized to delete this story");

    // delete the storage file
    await ctx.storage.delete(story.storageId);

    // delete the story
    await ctx.db.delete(args.storyId);
    console.log("Story deleted successfully");
  },
});

export const viewStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // only increment view if it's not the author's own story
    if (story.userId !== currentUser._id) {
      await ctx.db.patch(args.storyId, { views: (story.views || 0) + 1 });
    }
  },
});

export const toggleLike = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("storyLikes")
      .withIndex("by_user_and_story", (q) =>
        q.eq("userId", currentUser._id).eq("storyId", args.storyId)
      )
      .first();

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    if (existing) {
      // remove like
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.storyId, {
        likes: Math.max(0, (story.likes || 0) - 1),
      });
      return false; // unliked
    } else {
      // add like
      await ctx.db.insert("storyLikes", {
        userId: currentUser._id,
        storyId: args.storyId,
      });
      await ctx.db.patch(args.storyId, { likes: (story.likes || 0) + 1 });
      return true; // liked
    }
  },
});

// Clean up expired stories (can be called periodically)
export const cleanupExpiredStories = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredStories = await ctx.db
      .query("stories")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const story of expiredStories) {
      await ctx.storage.delete(story.storageId);
      await ctx.db.delete(story._id);
    }

    return expiredStories.length;
  },
});
