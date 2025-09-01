import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const addComment = mutation({
  args: {
    content: v.string(),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Post not found");

    const commentId = await ctx.db.insert("comments", {
      userId: currentUser._id,
      postId: args.postId,
      content: args.content,
    });

    // increment comment count by 1
    await ctx.db.patch(args.postId, { comments: post.comments + 1 });

    // create a notification if it's not my own post
    if (post.userId !== currentUser._id) {
      await ctx.db.insert("notifications", {
        receiverId: post.userId,
        senderId: currentUser._id,
        type: "comment",
        postId: args.postId,
        commentId,
      });
    }

    return commentId;
  },
});

export const getComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const commentsWithInfo = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: {
            fullname: user?.fullname,
            image: user?.image,
          },
        };
      })
    );

    return commentsWithInfo;
  },
});

// ------------------ DELETE COMMENT ------------------
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const comment = await ctx.db.get(commentId);
    if (!comment) throw new ConvexError("Comment not found");

    // Check if the user owns this comment or the post
    const post = await ctx.db.get(comment.postId);
    if (!post) throw new ConvexError("Post not found");

    if (comment.userId !== currentUser._id && post.userId !== currentUser._id) {
      throw new ConvexError("Unauthorized to delete this comment");
    }

    // delete the comment
    await ctx.db.delete(commentId);

    // decrement comment count on the post
    await ctx.db.patch(comment.postId, {
      comments: Math.max(0, post.comments - 1),
    });

    // remove related notifications (if commentId field exists in notifications)
    const allNotifications = await ctx.db.query("notifications").collect();
    const relatedNotifications = allNotifications.filter(
      (notif) => notif.commentId === commentId
    );

    for (const notif of relatedNotifications) {
      await ctx.db.delete(notif._id);
    }

    return { success: true };
  },
});
