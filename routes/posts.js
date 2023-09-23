// routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const verifyToken = require("../middleware/verifyToken");
const verifyAuthor = require("../middleware/verifyAuthor");
const verifyAdminOrAuthor = require("../middleware/verifyAdminOrAuthor");
const upload = require("../middleware/upload");

// Create a new blog post
router.post("/", verifyToken, verifyAuthor, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const author = req.user.id; // Assuming you're using JWT for authentication

    const newPost = new Post({ title, content, author, tags });
    const savedPost = await newPost.save();

    res.status(201).json(savedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get all blog posts with additional information
router.get("/posts", async (req, res) => {
  try {
    const posts = await Post.aggregate([
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
        $project: {
          _id: 1,
          title: 1,
          // content: 1,
          coverImage: 1,
          publicationDate: 1,
          authorInfo: { username: 1 },
          likesCount: { $size: "$likesData" },
          commentsCount: { $size: "$comments" },
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
router.get("/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

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
});

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

router.post("/upload-image", verifyToken, verifyAdminOrAuthor, upload.single("image"), async (req, res) => {
  try {
    const imageUrl = req.file.path;
    const { blogPostId, position, isCover } = req.body;

    const blogPost = await Post.findById(blogPostId);

    if (!blogPost) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    if (isCover) {
      // Update the cover image URL
      blogPost.coverImage = imageUrl;
    } else {
      // Create an image object with the URL and position
      const imageObject = {
        url: imageUrl,
        position: position,
      };

      // Insert the image object at the specified position
      blogPost.images.splice(position, 0, imageObject);
    }

    await blogPost.save();

    res.status(201).json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
