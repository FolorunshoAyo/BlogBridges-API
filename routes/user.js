// routes/user.js
const express = require("express");
const router = express.Router();
const UserActivity = require("../models/UserActivity");
const verifyToken = require("../middleware/verifyToken");
const verifyUser = require("../middleware/verifyUser");
const User = require("../models/User");
const Follow = require("../models/Follow");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Reply = require("../models/Reply");

// Get user activity (liked, commented, and replied posts and comments) for the verifyTokend user
router.get("/activity", verifyToken, verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the user's activity
    const userActivity = await UserActivity.findOne({ user: userId })
      .populate("likedPosts", "title")
      .populate("commentedPosts", "title")
      .populate("repliedComments", "content"); // Populate repliedComments with comment content

    if (!userActivity) {
      return res.status(404).json({ message: "User activity not found" });
    }

    res.json(userActivity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Define an endpoint to get user profile and paginated posts
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1; // Current page (default: 1)
  const pageSize = parseInt(req.query.pageSize) || 10; // Number of posts per page (default: 10)

  try {
    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count the total number of user's posts
    const totalPosts = await Post.countDocuments({ author: userId });

    // Calculate the skip value based on the current page and page size
    const skip = (page - 1) * pageSize;

    // Find the user's posts with pagination
    const userPosts = await Post.find({ author: userId })
      .skip(skip)
      .limit(pageSize);

    // Return user data, posts, and pagination info
    res.json({
      user,
      posts: userPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / pageSize),
      pageSize,
      totalPosts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define an endpoint to follow another user
router.post('/follow/:userIdToFollow', async (req, res) => {
  const { id: userId } = req.user;
  const { userIdToFollow } = req.params;

  try {
    // Check if the user is trying to follow themselves
    if (userId === userIdToFollow) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if the user is already following the target user
    const existingFollow = await Follow.findOne({ follower: userId, followedUser: userIdToFollow });

    if (existingFollow) {
      return res.status(400).json({ error: 'You are already following this user' });
    }

    // Create a new follow relationship
    const follow = new Follow({
      follower: userId,
      followedUser: userIdToFollow,
    });

    await follow.save();

    // Increment the totalFollows field for the user
    await User.findByIdAndUpdate(userId, { $inc: { totalFollows: 1 } });

    res.json({ message: 'You are now following the user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single blog post by ID
router.get("/:postId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const post = await Post.findById(req.params.postId);
    const user = await User.findById(userId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Update the user's readingHistory
    user.readingHistory.push({
      post: postId,
      timestamp: new Date(),
    });

    // Update the user's interestedTags, ensuring no duplicates
    const postTags = post.tags;
    postTags.forEach((tag) => {
      if (!user.interestedTags.includes(tag)) {
        user.interestedTags.push(tag);
      }
    });

    // Save the updated user data
    await user.save();


    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Like a post
router.post("/like/:postId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    const existingLike = await Like.findOne({
      user: userId,
      targetType: 'post',
      targetId: postId,
    });

    if (existingLike) {
      return res.status(400).json({ message: 'You have already liked this post' });
    }

    // Create a new like
    const newLike = new Like({
      user: userId,
      targetType: 'post',
      targetId: postId,
    });

    // Create a new notification associated with this like
    const newNotification = new Notification({
      sender: userId,
      recipient: post.author,
      type: "like",
      content: '{username} liked your post - "{post name}"', // Customize the notification message
    });

    // Save the new notification
    await newNotification.save();

    // Attach the notification reference to the like
    newLike.notification = newNotification._id;

    // Save the new like
    await newLike.save();

    // Update user activity to track liked posts
    await UserActivity.findOneAndUpdate(
      { user: userId },
      { $addToSet: { likedPosts: postId } },
      { upsert: true }
    );

    res.json({ message: "Post liked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Unlike a post
router.post('/unlikePost/:postId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    // Check if the user has liked the post
    const existingLike = await Like.findOne({
      user: userId,
      targetType: 'post',
      targetId: postId,
    });

    if (!existingLike) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }

    // If a notification is associated with this like, delete it
    if (existingLike.notification) {
      await Notification.findByIdAndDelete(existingLike.notification);
    }

    // Delete the like record
    await Like.findByIdAndRemove(existingLike._id);

     // Remove the like record from UserActivity
     await UserActivity.findOneAndUpdate(
      { user: userId },
      { $pull: { likedPosts: postId } }
    );

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Comment on a post
router.post("/comment/:postId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    const { content } = req.body;

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create a new comment
    const newComment = new Comment({ content, author: userId });
    await newComment.save();

    // Push the ObjectId of the new comment to the post's comments array
    post.comments.push(newComment._id);

    // Save the updated post to update the comments array
    await post.save();

    // Update user activity to track commented posts
    await UserActivity.findOneAndUpdate(
      { user: userId },
      { $addToSet: { commentedPosts: postId } },
      { upsert: true }
    );

    res.json({ message: "Comment posted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Reply to a comment
router.post("/reply/:commentId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = req.params.commentId;
    const { content } = req.body;

    // Check if the comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Create a new reply
    const newReply = new Reply({ content, author: userId });
    await newReply.save();

    // Push the ObjectId of the new reply to the coment's replies array
    comment.replies.push(newReply._id);

    // Update user activity to track replied comments
    await UserActivity.findOneAndUpdate(
      { user: userId },
      { $addToSet: { repliedComments: commentId } },
      { upsert: true }
    );

    res.json({ message: "Reply posted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Like a comment or reply
router.post("/like/:type/:id", validateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, id } = req.params;

    // Determine whether it's a comment or reply
    const model = type === "comment" ? Comment : Reply;

    // Check if the comment or reply exists
    const commentOrReply = await model.findById(id);
    if (!commentOrReply) {
      return res.status(404).json({ message: `${type} not found` });
    }

    // Update user activity to track liked comments or replies
    const fieldToUpdate = type === "comment" ? "likedComments" : "likedReplies";
    
    // Check if the user has already liked the post
    const existingLike = await Like.findOne({
      user: userId,
      targetType: type,
      targetId: id,
    });

    // If the user has already liked the post, remove the like
    if (existingLike) {
      return res.status(400).json({ message: `You have already liked this ${type}` });
    }

    // Create a new like for the post
    const newLike = new Like({
      user: userId,
      targetType: type,
      targetId: id,
    });

    // Create a new notification associated with this like
    const newNotification = new Notification({
      sender: userId,
      recipient: commentOrReply.author,
      type: "like",
      content: '{username} liked your ${type} - "{type details}"', // Customize the notification message
    });

    // Save the new notification
    await newNotification.save();

    // Attach the notification reference to the like
    newLike.notification = newNotification._id;

    await newLike.save();
    
    await UserActivity.findOneAndUpdate(
      { user: userId },
      { $addToSet: { [fieldToUpdate]: id } },
      { upsert: true }
    );

    res.json({ message: `${type} liked successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Unlike a comment or reply
router.post("/unlike/:type/:id", validateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, id } = req.params;

    // Determine whether it's a comment or reply
    const model = type === "comment" ? Comment : Reply;

    // Check if the comment or reply exists
    const commentOrReply = await model.findById(id);
    if (!commentOrReply) {
      return res.status(404).json({ message: `${type} not found` });
    }

    // Update user activity to track liked comments or replies
    const fieldToUpdate = type === "comment" ? "likedComments" : "likedReplies";
    
    // Check if the user has already liked the post
    const existingLike = await Like.findOne({
      user: userId,
      targetType: type,
      targetId: id,
    });

    if (!existingLike) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }

    // If a notification is associated with this like, delete it
    if (existingLike.notification) {
      await Notification.findByIdAndDelete(existingLike.notification);
    }

    // Delete the like record
    await Like.findByIdAndRemove(existingLike._id);

    // Remove the like record from UserActivity
    await UserActivity.findOneAndUpdate(
      { user: userId },
      { $pull: { [fieldToUpdate]: id } }
    );

    return res.json({ message: `${type} unliked successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});
