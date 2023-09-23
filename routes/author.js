const express = require("express");
const authenticate = require("../middleware/authenticate");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
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
        $project: {
          likesCount: { $size: "$likesData" },
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

module.exports = router;
