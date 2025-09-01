import { v } from "convex/values";
import {
  mutation,
  query,
} from "./_generated/server";
import { getAuthenticatedUser } from "./users";
import { Id } from "./_generated/dataModel";

// Generate upload URL for story media
export const generateStoryUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});

// Create a new story
export const createStory = mutation({
  args: {
    caption: v.optional(v.string()),
    storageId: v.id("_storage"),
    mediaType: v.union(v.literal("image"), v.literal("video")),
  },

  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const mediaUrl = await ctx.storage.getUrl(args.storageId);
    if (!mediaUrl) throw new Error("Media not found");

    // Create story with 24-hour expiry
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    const storyId = await ctx.db.insert("stories", {
      userId: currentUser._id,
      mediaUrl,
      storageId: args.storageId,
      mediaType: args.mediaType,
      caption: args.caption,
      viewers: 0,
      expiresAt,
    });

    return storyId;
  },
});

// Get stories for feed (from following users + own stories)
export const getFeedStories = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const now = Date.now();

    // Get users that current user follows
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", currentUser._id))
      .collect();

    const followingIds = follows.map((f) => f.followingId);
    const allUserIds = [currentUser._id, ...followingIds];

    // Get active stories from followed users + own stories
    const allStories = await ctx.db
      .query("stories")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Filter stories by users we follow + our own
    const relevantStories = allStories.filter((story) =>
      allUserIds.includes(story.userId)
    );

    // Group stories by user
    const storiesByUser = new Map<Id<"users">, typeof relevantStories>();
    
    for (const story of relevantStories) {
      if (!storiesByUser.has(story.userId)) {
        storiesByUser.set(story.userId, []);
      }
      storiesByUser.get(story.userId)!.push(story);
    }

    // Get user info for each group
    const storyGroups = await Promise.all(
      Array.from(storiesByUser.entries()).map(async ([userId, stories]) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Sort stories by creation time (newest first)
        const sortedStories = stories.sort((a, b) => b._creationTime - a._creationTime);

        // Check if user has unseen stories
        const hasUnseenStories = await Promise.all(
          sortedStories.map(async (story) => {
            const view = await ctx.db
              .query("storyViews")
              .withIndex("by_story_and_user", (q) =>
                q.eq("storyId", story._id).eq("userId", currentUser._id)
              )
              .first();
            return !view; // true if not viewed
          })
        );

        const hasUnseen = hasUnseenStories.some(Boolean);

        return {
          user: {
            _id: user._id,
            username: user.username,
            image: user.image,
          },
          stories: sortedStories,
          hasUnseen,
          isOwn: userId === currentUser._id,
        };
      })
    );

    // Filter out null entries and sort (own stories first, then by newest story)
    const validStoryGroups = storyGroups
      .filter((group) => group !== null)
      .sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1;
        if (!a.isOwn && b.isOwn) return 1;
        return b.stories[0]._creationTime - a.stories[0]._creationTime;
      });

    return validStoryGroups;
  },
});

// Get user's own stories
export const getUserStories = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const targetUserId = args.userId || currentUser._id;
    const now = Date.now();

    const stories = await ctx.db
      .query("stories")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    return stories.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Mark story as viewed
export const markStoryAsViewed = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // Check if already viewed
    const existingView = await ctx.db
      .query("storyViews")
      .withIndex("by_story_and_user", (q) =>
        q.eq("storyId", args.storyId).eq("userId", currentUser._id)
      )
      .first();

    if (existingView) return; // Already viewed

    // Create view record
    await ctx.db.insert("storyViews", {
      storyId: args.storyId,
      userId: currentUser._id,
      viewedAt: Date.now(),
    });

    // Increment viewer count
    const story = await ctx.db.get(args.storyId);
    if (story) {
      await ctx.db.patch(args.storyId, {
        viewers: story.viewers + 1,
      });
    }
  },
});

// Get story viewers
export const getStoryViewers = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    
    // Verify story ownership
    const story = await ctx.db.get(args.storyId);
    if (!story || story.userId !== currentUser._id) {
      throw new Error("Not authorized to view story viewers");
    }

    const views = await ctx.db
      .query("storyViews")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();

    const viewersWithInfo = await Promise.all(
      views.map(async (view) => {
        const user = await ctx.db.get(view.userId);
        return {
          _id: view._id,
          viewedAt: view.viewedAt,
          user: {
            _id: user?._id,
            username: user?.username,
            image: user?.image,
          },
        };
      })
    );

    return viewersWithInfo.sort((a, b) => b.viewedAt - a.viewedAt);
  },
});

// Delete story
export const deleteStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // Verify ownership
    if (story.userId !== currentUser._id) {
      throw new Error("Not authorized to delete this story");
    }

    // Delete associated views
    const views = await ctx.db
      .query("storyViews")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();

    for (const view of views) {
      await ctx.db.delete(view._id);
    }

    // Delete the storage file
    await ctx.storage.delete(story.storageId);

    // Delete the story
    await ctx.db.delete(args.storyId);
  },
});

// Cleanup expired stories (to be called periodically)
export const cleanupExpiredStories = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    const expiredStories = await ctx.db
      .query("stories")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    for (const story of expiredStories) {
      // Delete associated views
      const views = await ctx.db
        .query("storyViews")
        .withIndex("by_story", (q) => q.eq("storyId", story._id))
        .collect();

      for (const view of views) {
        await ctx.db.delete(view._id);
      }

      // Delete the storage file
      await ctx.storage.delete(story.storageId);

      // Delete the story
      await ctx.db.delete(story._id);
    }

    return { deletedCount: expiredStories.length };
  },
});
