// routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const verifyAuthor = require("../middleware/verifyAuthor");
const verifyAdminOrAuthor = require("../middleware/verifyAdminOrAuthor");
const upload = require("../middleware/upload");

// Create a new blog post
router.post("/new", verifyToken, verifyAuthor, async (req, res) => {
  try {
    const { title, content, tags, coverImage } = req.body;
    const author = req.user.id; // Assuming you're using JWT for authentication

    const newPost = new Post({ title, content, author, tags, coverImage });
    const savedPost = await newPost.save();

    res.status(201).json(savedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get all blog posts with additional information
router.get("/all-posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page (default: 1)
  const pageSize = parseInt(req.query.pageSize) || 10; // Number of posts per page (default: 10)

  try {
    const posts = await Post.aggregate([
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
          from: "likes",
          localField: "_id",
          foreignField: "targetId",
          as: "likesData",
        },
      },
      {
        $lookup: {
          from: "users", // Assuming your users collection is named 'users'
          let: { post_id: "$_id" },
          pipeline: [
            {
              $unwind: "$readingHistory", // Unwind the readingHistory array
            },
            {
              $match: {
                $expr: { $eq: ["$readingHistory", "$$post_id"] }, // Match posts in readingHistory
              },
            },
            {
              $group: {
                _id: null,
                userCount: { $sum: 1 }, // Count users for each post
              },
            },
          ],
          as: "usersWithPostInHistory",
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
          userCount: { $arrayElemAt: ["$usersWithPostInHistory.userCount", 0] }, // Extract user count
        },
      },
    ]);

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get a single blog post by ID
router.get("/:postId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await Post.findById(postId);
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

// Update a blog post by ID
router.put("/:postId", verifyToken, verifyAdminOrAuthor, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      { title, content, tags },
      { new: true }
    ).populate("author", "username");

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Delete a blog post by ID
router.delete("/:postId", verifyToken, verifyAdminOrAuthor, async (req, res) => {
    try {
      const deletedPost = await Post.findByIdAndDelete(req.params.postId);

      if (!deletedPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json({ message: "Post deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// Search and filter blog posts
router.get("/search", async (req, res) => {
  try {
    const { keyword, category, author, startDate, endDate } = req.query;

    // Define a query object to build the MongoDB query dynamically
    const query = {};

    // Add search by keyword
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } }, // Case-insensitive title search
        { content: { $regex: keyword, $options: "i" } }, // Case-insensitive content search
      ];
    }

    // Add category filter
    if (category) {
      query["tags"] = category; // Assuming tags store category information
    }

    // Add author filter
    if (author) {
      query["author"] = author; // Assuming author stores user ID
    }

    // Add date range filter
    if (startDate && endDate) {
      query["publicationDate"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Perform the search and filtering
    const posts = await Post.find(query).populate("author", "username");

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/:postId/comments', async (req, res) => {
  const postId = req.params.postId;

  try {
    // Find the post and populate comments
    const post = await Post.findById(postId)
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: ['username', 'role'], // Populate user information (username)
        },
      });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Return comments and their replies
    res.json(post.comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/comments/:commentId/replies', async (req, res) => {
  const commentId = req.params.commentId;

  try {
    // Find the comment and populate replies
    const comment = await Comment.findById(commentId)
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: ['username', 'role'], // Populate user information for replies
        },
      })

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Return the replies
    res.json(comment.replies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// router.post("/upload-image", verifyToken, verifyAdminOrAuthor, upload.single("image"), async (req, res) => {
//   try {
//     const imageUrl = req.file.path;
//     const { blogPostId, position, isCover } = req.body;

//     const blogPost = await Post.findById(blogPostId);

//     if (!blogPost) {
//       return res.status(404).json({ message: "Blog post not found" });
//     }

//     if (isCover) {
//       // Update the cover image URL
//       blogPost.coverImage = imageUrl;
//     } else {
//       // Create an image object with the URL and position
//       const imageObject = {
//         url: imageUrl,
//         position: position,
//       };

//       // Insert the image object at the specified position
//       blogPost.images.splice(position, 0, imageObject);
//     }

//     await blogPost.save();

//     res.status(201).json({ imageUrl });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

module.exports = router;
