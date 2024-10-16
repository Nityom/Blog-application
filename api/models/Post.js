const mongoose = require('mongoose');
const { Schema } = mongoose; // Import Schema from mongoose

const commentSchema = new Schema({
    user:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    text:{
        type:String,
        required:true,

    },
    createdAt:{
        type:Date,
        default:Date.now
    }
})

const postSchema = new Schema({
    title: String,
    summary: String,
    content: String,
    cover: String,
    author: {
        type: Schema.Types.ObjectId, // Correct the type definition
        ref: 'User'
    },
    likes:{
        type:Number,
        default:0
    },
    likedBy:[{
        type:Schema.Types.ObjectId,
        ref:'User'
    }],
    comments:[commentSchema]
}, {
    timestamps: true
});

const PostModel = mongoose.model('Post', postSchema);

module.exports = PostModel;
