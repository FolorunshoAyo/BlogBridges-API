const express = require('express');
const authenticate = require('../middleware/authenticate');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');

const router = express.Router();

// Get statistics for the currently authenticated author
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const authorId = req.user.id;

    // Calculate statistics
    const postCount = await Post.countDocuments({ author: authorId });
    const commentCount = await Comment.countDocuments({ author: authorId });

    // Calculate the number of likes by aggregating likes on the author's posts
    const likesCount = await Post.aggregate([
      {
        $match: { author: authorId },
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
        $project: {
          likesCount: { $size: '$likesData' },
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$likesCount' },
        },
      },
    ]);

    // Extract the total likes count from the aggregation result
    const totalLikes = likesCount[0] ? likesCount[0].totalLikes : 0;

    // Create the statistics object
    const statistics = {
      postCount,
      commentCount,
      totalLikes,
    };

    res.json(statistics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
