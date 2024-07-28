const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/postMiniApp');

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  age: Number,
  email: String,
  password: String,
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "post"
  }],
  profilePic: {
    type: String,
    default: 'default.jpeg'
  }
});

module.exports = mongoose.model("user", userSchema);