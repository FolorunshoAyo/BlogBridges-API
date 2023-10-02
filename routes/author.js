const express = require("express");
const Post = require("../models/Post");
// const Comment = require("../models/Comment");
// const Like = require('../models/Like');
const verifyToken = require("../middleware/verifyToken");
const verifyAuthor = require("../middleware/verifyAuthor");

const router = express.Router();

// Get statistics for the currently authenticated author
router.get("/statistics", verifyToken, verifyAuthor, async (req, res) => {
  try {
    const authorId = req.user.id;

    // Calculate statistics
    const postCount = await Post.countDocuments({ author: authorId });
    const commentCount = await Post.aggregate([
      {
        $match: {
          author: authorId, // Filter posts by the author's ID
        },
      },
      {
        $project: {
          commentCount: { $size: "$comments" }, // Count the number of comments in each post
        },
      },
      {
        $group: {
          _id: null, // Group all results together
          totalCommentCount: { $sum: "$commentCount" }, // Sum the comment counts
        },
      },
    ]);

    // Calculate the number of likes by aggregating likes on the author's posts
    const likesCount = await Post.aggregate([
      {
        $match: { author: authorId },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "targetId",
          as: "likesData",
        },
      },
      {
        $lookup: {
          from: "postviews",
          localField: "_id",
          foreignField: "post",
          as: "viewedPosts",
        },
      },
      {
        $project: {
          likesCount: { $size: "$likesData" },
          viewedPostsCount: { $size: "$viewedPosts" },
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: "$likesCount" },
        },
      },
    ]);

    // Extract the total likes count from the aggregation result
    const totalLikes = likesCount[0] ? likesCount[0].totalLikes : 0;
    const totalCommentCount = commentCount[0].totalCommentCount;

    // Create the statistics object
    const statistics = {
      postCount,
      totalCommentCount,
      totalLikes,
    };

    res.json(statistics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Define an endpoint to get user profile and paginated posts
router.get('/posts/:authorId', async (req, res) => {
  const { authorId } = req.params;
  const page = parseInt(req.query.page) || 1; // Current page (default: 1)
  const pageSize = parseInt(req.query.pageSize) || 10; // Number of posts per page (default: 10)

  try {
    // Find the user
    const user = await User.findById(authorId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count the total number of user's posts
    const totalPosts = await Post.countDocuments({ author: authorId });

    // Find the user's posts with pagination
    const userPosts = await Post.aggregate([
      {
        $match: { author: authorId },
      },
      {
        $skip: (page - 1) * pageSize, // Implement pagination
      },
      {
        $limit: pageSize,
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorInfo",
        },
      },
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'targetId',
          as: 'likesData',
        },
      },
      {
        $lookup: {
          from: 'users', // Assuming your users collection is named 'users'
          let: { post_id: '$_id' },
          pipeline: [
            {
              $unwind: '$readingHistory', // Unwind the readingHistory array
            },
            {
              $match: {
                $expr: { $eq: ['$readingHistory', '$$post_id'] }, // Match posts in readingHistory
              },
            },
            {
              $group: {
                _id: null,
                userCount: { $sum: 1 }, // Count users for each post
              },
            },
          ],
          as: 'usersWithPostInHistory',
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          // content: 1,
          coverImage: 1,
          publicationDate: 1,
          authorInfo: { username: 1 },
          likesCount: { $size: "$likesData" },
          commentsCount: { $size: "$comments" },
          userCount: { $arrayElemAt: ['$usersWithPostInHistory.userCount', 0] }, // Extract user count
        },
      },
    ]);

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

// Update user profile (username, bio, profileImage)
router.put('/profile', verifyToken, verifyAuthor, async (req, res) => {
  const userId = req.user.id; // Assuming you have a user object in req
  const { username, bio, profileImage } = req.body;

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

module.exports = router;
