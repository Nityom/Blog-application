const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const Post = require('./models/Post.js');
require('dotenv').config();

const salt = bcrypt.genSaltSync(10);
const secret = 'my_jsonwebtoken_secured_key'; // Replace with a secure secret key

app.use(cors({
  credentials: true,
  origin: "http://localhost:5173"
}));

app.use(cookieParser());
app.use(express.json());

app.use('/uploads',express.static(__dirname+'/uploads'))

const connectionurl = process.env.MONGODB_URL;

mongoose.connect(connectionurl)
  .then(() => {
    console.log('mongodb connected successfully');
  })
  .catch((err) => {
    console.log(err);
  });

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const newUser = await User.create({
    username: username,
    password: bcrypt.hashSync(password, salt)
  });
  res.status(200).json({
    user: {
      newUser
    }
  });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  const isPasswordValid = bcrypt.compareSync(password, userDoc.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  // Generate a JWT token
  const token = jwt.sign({ id: userDoc._id, username: userDoc.username }, secret, { expiresIn: '1h' });

  // Set the JWT token as a cookie and send the response
  res.cookie('token', token, { httpOnly: true, maxAge: 3600000}) // 1 hour expiration
    .status(200).json({
      message: 'Login successful',
      id: userDoc._id,
      username: userDoc.username,
      token
    });
});

app.get('/profile', (req, res) => {
  // Extract the token from cookies
  const { token } = req.cookies;

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  // Clear the token cookie
  res.cookie('token', '', { maxAge: 0 });
  res.status(200).json({ message: 'Logged out successfully' });
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newpath = path + '.' + ext;
  fs.renameSync(path, newpath);

  const { title, summary, content } = req.body;
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async(err, info) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newpath,
      author:info.id
    });
    res.json(postDoc);
  });

});

app.get('/allposts', async (req, res) => {
  try {
    const posts = await Post.find()
    .populate('author',['username'])
    .sort({createdAt:-1})
    .limit(20)
    
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts', error: err });
  }
});

app.get('/post/:id',async(req,res)=>{
  const {id} = req.params;
  const postdoc = await Post.findById(id).populate('author',['username'])
  res.json(postdoc)
})

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title, summary, content } = req.body;

  try {
    // Find the existing post
    const postDoc = await Post.findById(id);

    if (!postDoc) return res.status(404).json({ message: 'Post not found' });

    // Update post fields
    postDoc.title = title || postDoc.title;
    postDoc.summary = summary || postDoc.summary;
    postDoc.content = content || postDoc.content;

    // Handle file upload and update cover if a new file is provided
    if (req.file) {
      const { originalname, path } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      const newpath = path + '.' + ext;
      fs.renameSync(path, newpath);
      postDoc.cover = newpath;
    }

    // Save the updated post
    await postDoc.save();
    res.json(postDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
});

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


app.post('/post/:id/comment', async (req, res) => {
  const { id } = req.params; // Post ID
  const { text } = req.body; // Comment text
  const { token } = req.cookies; // JWT token to verify user

  try {
    // Verify JWT token
    jwt.verify(token, secret, {}, async (err, userInfo) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });

      // Find the post by ID
      const post = await Post.findById(id);

      // Create a new comment
      const newComment = {
        user: userInfo.id, 
        text
      };

      // Add the comment to the post's comments array
      post.comments.push(newComment);

      // Save the updated post
      await post.save();

      // Return the updated post with the new comment
      res.status(200).json(post);
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
});

app.get('/post/:id/comments', async (req, res) => {
  const { id } = req.params; // Post ID

  try {
    // Find the post by ID and populate the user details for each comment
    const post = await Post.findById(id).populate('comments.user', 'username');

    // Return the comments
    res.status(200).json(post.comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
});

app.delete('/post/:id/comment/:commentId', async (req, res) => {
  const { id, commentId } = req.params; // Post ID and Comment ID
  const { token } = req.cookies; // JWT token to verify user

  try {
    // Verify JWT token
    jwt.verify(token, secret, {}, async (err, userInfo) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });

      // Find the post by ID
      const post = await Post.findById(id);

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Find the comment by ID
      const comment = post.comments.id(commentId);

      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      // Check if the user is the owner of the comment
      if (comment.user.toString() !== userInfo.id) {
        return res.status(403).json({ message: 'You are not authorized to delete this comment' });
      }

      // Use filter to remove the comment from the array
      post.comments = post.comments.filter(c => c._id.toString() !== commentId);

      // Save the updated post
      await post.save();

      // Return the updated post without the deleted comment
      res.status(200).json(post);
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
});







app.listen(4000, () => {
  console.log('server started');
});
