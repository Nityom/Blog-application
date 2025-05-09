# Full-stack-blog-application

A full-stack blog platform built with **React**, **Node.js**, **Express**, and **MongoDB**. Users can sign up, log in, create, edit, delete posts, like posts, and comment. Includes authentication with **JWT**, image uploads with **Multer**, and a modern frontend with **Tailwind CSS**.

---

## 🚀 Features

- User authentication (Signup/Login/Logout) with JWT and cookies.
- Create, edit, and delete blog posts (authors only).
- Like posts (one like per user).
- Add, view, and delete comments.
- Image upload for posts.
- Responsive and clean UI.

---

## 🛠 Tech Stack

- **Frontend**: React, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with Mongoose
- **Authentication**: JWT, bcrypt, cookies
- **File Upload**: Multer
- **Other Tools**: dotenv, cors, cookie-parser

---
## ⚙️ Setup Instructions

1. **Clone the repository:**

```bash
   git clone https://github.com/Nityom/Blog-application.git
   cd Blog-application
```

2. **Backend Setup:**

```bash
    npm install

    Create a .env file inside /api directory:


MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key

Start the backend server:

    npm start

Frontend Setup:

    cd blog-application
    npm install
    npm run dev

    Visit the app at: http://localhost:5173

```

🔒 Environment Variables

Create a .env file in the /api folder with the following:
```bash
MONGODB_URL=your_mongo_connection
```
