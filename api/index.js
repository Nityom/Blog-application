const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const Post = require('./models/Post.js');
require('dotenv').config();

// Middleware setup
const uploadMiddleware = multer({ dest: 'uploads/' });
const salt = bcrypt.genSaltSync(10);
const secret = process.env.JWT_SECRET || 'fallback_secret_key';

app.use(cors({
  credentials: true,
  origin: "http://localhost:5173"
}));

app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(__dirname + '/uploads'));

// MongoDB Connection
const connectionurl = process.env.MONGODB_URL;

mongoose.connect(connectionurl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newUser = await User.create({
      username,
      password: bcrypt.hashSync(password, salt)
    });
    res.status(200).json({ user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc) return res.status(400).json({ message: 'Invalid username or password' });

  const isPasswordValid = bcrypt.compareSync(password, userDoc.password);

  if (!isPasswordValid) return res.status(400).json({ message: 'Invalid username or password' });

  const token = jwt.sign({ id: userDoc._id, username: userDoc.username }, secret, { expiresIn: '1h' });

  res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }) // 1 hour expiration
    .status(200).json({ message: 'Login successful', id: userDoc._id, username: userDoc.username, token });
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', { maxAge: 0 });
  res.status(200).json({ message: 'Logged out successfully' });
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const ext = originalname.split('.').pop();
  const newPath = `${path}.${ext}`;
  fs.renameSync(path, newPath);

  const { title, summary, content } = req.body;
  const { token } = req.cookies;

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id
    });
    res.json(postDoc);
  });
});

app.get('/allposts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts', error: err.message });
  }
});

app.get('/post/:id', async (req, res) => {
  try {
    const postDoc = await Post.findById(req.params.id).populate('author', ['username']);
    if (!postDoc) return res.status(404).json({ message: 'Post not found' });
    res.json(postDoc);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching post', error: err.message });
  }
});

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title, summary, content } = req.body;

  try {
    const postDoc = await Post.findById(id);
    if (!postDoc) return res.status(404).json({ message: 'Post not found' });

    postDoc.title = title || postDoc.title;
    postDoc.summary = summary || postDoc.summary;
    postDoc.content = content || postDoc.content;

    if (req.file) {
      const { originalname, path } = req.file;
      const ext = originalname.split('.').pop();
      const newPath = `${path}.${ext}`;
      fs.renameSync(path, newPath);
      postDoc.cover = newPath;
    }

    await postDoc.save();
    res.json(postDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
});

// Like Post
app.post('/post/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.cookies;

    jwt.verify(token, secret, {}, async (err, userInfo) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });

      const post = await Post.findById(id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const alreadyLiked = Array.isArray(post.likedBy) && post.likedBy.includes(userInfo.id);
      if (alreadyLiked) return res.status(400).json({ message: 'You have already liked this post' });

      post.likes += 1;
      post.likedBy.push(userInfo.id);

      await post.save();
      res.status(200).json({ message: 'Post liked successfully', likes: post.likes });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error liking the post', error: error.message });
  }
});

// Add Comment
app.post('/post/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const { token } = req.cookies;

  try {
    jwt.verify(token, secret, {}, async (err, userInfo) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });

      const post = await Post.findById(id);
      const newComment = { user: userInfo.id, text };

      post.comments.push(newComment);
      await post.save();

      res.status(200).json(post);
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
});

// Get Comments
app.get('/post/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('comments.user', 'username');
    res.status(200).json(post.comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
});

// Delete Comment
app.delete('/post/:id/comment/:commentId', async (req, res) => {
  const { id, commentId } = req.params;
  const { token } = req.cookies;

  try {
    jwt.verify(token, secret, {}, async (err, userInfo) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });

      const post = await Post.findById(id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const comment = post.comments.id(commentId);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      if (comment.user.toString() !== userInfo.id) {
        return res.status(403).json({ message: 'You are not authorized to delete this comment' });
      }

      post.comments = post.comments.filter(c => c._id.toString() !== commentId);
      await post.save();

      res.status(200).json(post);
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
});

// Delete Post
app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;
  const { token } = req.cookies;

  jwt.verify(token, process.env.JWT_SECRET, {}, async (err, userInfo) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });

    const postDoc = await Post.findById(id);
    if (!postDoc) return res.status(404).json({ message: 'Post not found' });

    if (postDoc.author.toString() !== userInfo.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({ message: 'Post deleted successfully' });
  });
});


// Catch-All for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start Server
app.listen(4000, () => {
  console.log('Server started on port 4000');
});
