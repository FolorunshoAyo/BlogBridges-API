// routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const verifyToken = require('../middleware/verifyToken');
const verifyAuthor = require('../middleware/verifyAuthor');

// Create a new blog post
router.post('/', verifyToken, verifyAuthor,  async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const author = req.user.id; // Assuming you're using JWT for authentication

    const newPost = new Post({ title, content, author, tags });
    const savedPost = await newPost.save();

    res.status(201).json(savedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all blog posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username');
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get a single blog post by ID
router.get('/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a blog post by ID
router.put('/:postId', verifyToken, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      { title, content, tags },
      { new: true }
    ).populate('author', 'username');

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete a blog post by ID
router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.postId);

    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
