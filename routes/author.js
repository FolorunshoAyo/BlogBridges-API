const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
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
    const likesAndViewsCount = await Post.aggregate([
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
      // Lookup users who have read the posts and populate 'readByUsers' field
      {
        $lookup: {
          from: 'users', // Collection name for the 'User' model
          localField: '_id',
          foreignField: 'readHistory',
          as: 'viewedPosts',
        },
      },
      // Unwind the 'readByUsers' array
      { $unwind: '$viewedPosts' },
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
          viewedPostsCount: { $sum: "$viewedPosts" }
        },
      },
    ]);

    // Extract the total likes count from the aggregation result
    const totalLikes = likesAndViewsCount[0]? likesAndViewsCount[0].totalLikes : 0;
    const totalCommentCount = commentCount[0]? commentCount[0].totalCommentCount : 0;
    const totalViews = likesAndViewsCount[0]? likesAndViewsCount[0].viewedPostsCount : 0;

    // Create the statistics object
    const statistics = {
      postCount,
      totalCommentCount,
      totalLikes,
      totalViews
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
    const user = await User.findById(authorId).select('-password');

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

module.exports = router;
