import React, { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../UserContext';

function PostPage() {
  const [postInfo, setPostInfo] = useState(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const { userInfo } = useContext(UserContext);
  const { id } = useParams();

  useEffect(() => {
    fetch(`http://localhost:4000/post/${id}`)
      .then((response) => response.json())
      .then((postInfo) => {
        setPostInfo(postInfo);
        setHasLiked(postInfo.likedBy?.includes(userInfo.id));
      });
  }, [id, userInfo.id]);

  useEffect(() => {
    fetch(`http://localhost:4000/post/${id}/comments`)
      .then((response) => response.json())
      .then((commentsData) => {
        setComments(commentsData);
      });
  }, [id]);

  const handleLike = () => {
    fetch(`http://localhost:4000/post/${id}/like`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === 'Post liked successfully') {
          setPostInfo((prevPostInfo) => ({
            ...prevPostInfo,
            likes: prevPostInfo.likes + 1,
          }));
          setHasLiked(true);
        }
      })
      .catch((error) => console.error('Error:', error));
  };

  const handleCommentSubmit = (e) => {
    

    fetch(`http://localhost:4000/post/${id}/comment`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: commentText }),
    })
      .then((response) => response.json())
      .then((newComment) => {
        setComments([...comments, newComment]);
        setCommentText('');
      })
      .catch((error) => console.error('Error:', error));
  };

  const handleDeleteComment = (commentId) => {
    fetch(`http://localhost:4000/post/${id}/comment/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then(() => {
        setComments(comments.filter((comment) => comment._id !== commentId));
      })
      .catch((error) => console.error('Error:', error));
  };

  if (!postInfo) return '';

  return (
    <article className="prose prose-gray max-w-6xl mx-auto dark:prose-invert px-4 sm:px-6 lg:px-8">
      <img
        src={`http://localhost:4000/${postInfo.cover}`}
        alt={postInfo.title}
        className="w-full max-w-full h-auto max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-hidden rounded-lg object-cover"
      />
      <div className="space-y-4 not-prose mt-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight lg:text-5xl">
          {postInfo.title}
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">{postInfo.summary}</p>
      </div>
      <div className="mt-8 space-y-4">
        <div dangerouslySetInnerHTML={{ __html: postInfo.content }} />
      </div>
      <div className="mt-8">
        <p className="text-sm text-gray-500">
          Written by <strong>{postInfo.author.username}</strong> on{' '}
          {new Date(postInfo.createdAt).toLocaleDateString()}
        </p>
      </div>
      {userInfo.id === postInfo.author._id && (
        <div className="mt-4">
          <Link to={`/edit/${postInfo._id}`}>Edit this post</Link>
        </div>
      )}
      <div className="mt-8">
        <button
          onClick={handleLike}
          disabled={hasLiked}
          className={`px-4 py-2 rounded ${
            hasLiked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {hasLiked ? 'Liked' : 'Like'}
        </button>
        <p className="text-sm text-gray-500 mt-2">
          {postInfo.likes} {postInfo.likes === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Comments Section */}
      <div className="mt-8 space-y-6">
        <h2 className="text-2xl font-bold">Comments</h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="space-y-4">
          <textarea
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Comment
          </button>
        </form>

        {/* Comment List */}
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment._id} className="border p-4 rounded-lg bg-gray-50">
              <p>
                <strong>{comment.user.username}</strong> - {new Date(comment.createdAt).toLocaleString()}
              </p>
              <p>{comment.text}</p>
              {comment.user._id === userInfo.id && (
                <button
                  onClick={() => handleDeleteComment(comment._id)}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default PostPage;
