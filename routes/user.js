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
const Like = require("../models/Like");
const Token = require("../models/Token");
const bcrypt = require('bcrypt');
const crypto = require("crypto");

// Get user activity (liked, commented, and replied posts and comments) for the user
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

// Define an endpoint to follow another user
router.post('/follow/:userIdToFollow', verifyToken, async (req, res) => {
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
router.post("/like/:type/:id", verifyToken, async (req, res) => {
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
router.post("/unlike/:type/:id", verifyToken, async (req, res) => {
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

router.put('/change-password', verifyToken, async (req, res) => {
  const userId = req.user.id; // Assuming you have a user object in req
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the current password is correct
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash and update the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile (username, bio, profileImage)
router.put('/update-profile', verifyToken, async (req, res) => {
  const userId = req.user.id; // Assuming you have a user object in req
  const { username = null, bio = null, profileImage = null } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.profileImage = profileImage || user.profileImage;

    await user.save();

    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for requesting a password reset
router.post('/reset-request', async (req, res) => {
  const { email } = req.body;

  // Generate a unique reset token
  const token = crypto.randomBytes(32).toString('hex');

  // Find the user by email
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Save the token in the database
  const resetToken = new Token({
    userId: user._id,
    token,
  });

  await resetToken.save();

  // Compose and send the reset email
  const mailOptions = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Password Reset',
    text: `Click the following link to reset your password: http://yourapp.com/reset/${token}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email sending error:', error);
      return res.status(500).json({ message: 'Failed to send reset email.' });
    }
    console.log('Email sent:', info.response);
    res.status(200).json({ message: 'Password reset email sent.' });
  });
});

// Route for verifying the reset token
router.get('/reset/:token', async (req, res) => {
  const { token } = req.params;

  // Find the token in the database
  const resetToken = await Token.findOne({ token });

  if (!resetToken) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }

  // Token is valid, so allow the user to reset the password
  res.status(200).json({ message: 'Token verified. Proceed to reset the password.' });
});

// Route for updating the user's password after token verification
router.post('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  // Find the token in the database
  const resetToken = await Token.findOne({ token });

  if (!resetToken) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }

  // Find the user by the token's userId
  const user = await User.findById(resetToken.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update the user's password and remove the token
  user.password = hashedPassword;
  await user.save();
  await resetToken.remove();

  res.status(200).json({ message: 'Password reset successful.' });
});



module.exports = router;