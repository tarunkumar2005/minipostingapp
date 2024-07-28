const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const upload = require('./config/multer');
const path = require('path');
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get('/', async (req, res) => {
  const token = req.cookies.token;

  if(!token) {
    res.render("index");
  } else {
    res.redirect("/profile");
  }
});

app.get('/login', (req, res) => {
  const token = req.cookies.token;

  if(!token) {
    res.render("login");
  } else {
    res.redirect("/profile");
  }
});

app.get('/profile', isLoggedin, async (req, res) => {
  const token = req.cookies.token;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid }).populate("posts");
  
    res.render('profile', {user});
  }
});

app.get('/post', isLoggedin, async (req, res) => {
  const token = req.cookies.token;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid });
    let posts = await postModel.find().populate("user").sort({ date: -1 });

    res.render('posts', { posts, user });
  }
});

app.get('/like/:id', isLoggedin, async (req, res) => {
  const token = req.cookies.token;
  let { id } = req.params;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid });

    let post = await postModel.findOne({ _id: id }).populate('user');

    if(!post) {
      res.redirect('/');
    } else {
      if(post.likes.indexOf(user._id) === -1) {
        post.likes.push(user._id);
      } else {
        post.likes.splice(post.likes.indexOf(user._id), 1);
      }
  
      await post.save();
  
      res.redirect('/post');
    }
  }
});

app.get('/post/create', isLoggedin, async (req, res)=>{
  const token = req.cookies.token;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid });
  
    res.render('postCreate', {user});
  }
});

app.post('/post/create', isLoggedin, async (req, res) => {
  let { postContent } = req.body;
  const token = req.cookies.token;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid });

    let post = await postModel.create({
      user: user._id,
      content: postContent
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect('/profile');
  }
})

app.get('/delete/:id', isLoggedin, async (req, res) => {
  let { id } = req.params;
  const token = req.cookies.token;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid });

    let post = await postModel.findOneAndDelete({ _id: id });

    user.posts.splice(user.posts.indexOf(post._id), 1);

    res.redirect('/profile');
  }
});

app.get('/edit/:id', isLoggedin, async (req, res) => {
  let { id } = req.params;

  let post = await postModel.findOne({ _id: id });

  res.render('edit', {post});
})

app.post('/edit/:id', isLoggedin, async (req, res) => {
  let { id } = req.params;
  const token = req.cookies.token;

  if(!token || token === "") {
    res.redirect('/login');
  } else {
    const decoded = jwt.verify(token, "fhuosurhw940278trgfibsjky9428");
    const userid = decoded.userid;
  
    let user = await userModel.findOne({ _id: userid });

    let { postContent } = req.body;
    let post = await postModel.findOne({ _id: id });

    post.content = postContent;
    post.save();

    res.redirect('/profile');
  }
});

app.post('/create', upload.single("profilePic"), async (req, res) => {
  let { username, name, email, password, age } = req.body;

  let user = await userModel.findOne({ email });

  if(user) {
    return res.status(500).send("User Already registered.");
  }

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let createdUser = await userModel.create({
        username,
        name,
        email,
        age,
        password: hash,
        profilePic: req.file.filename
      });

      let token = jwt.sign({email: createdUser.email, userid: createdUser._id}, "fhuosurhw940278trgfibsjky9428");
      res.cookie('token', token);
      res.redirect('/profile');
    })
  })
});

app.post('/login', async (req, res) => {
  let { email, password } = req.body;

  let user = await userModel.findOne({ email });

  if(!user) {
    return res.status(500).send("Something went wrong.");
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({email: user.email, userid: user._id}, "fhuosurhw940278trgfibsjky9428");
      res.cookie('token', token);
      res.redirect('/profile');
    }
  })
});

app.get('/logout', async (req, res) => {
  res.cookie('token', '');
  res.redirect('/login');
});

function isLoggedin(req, res, next) {
  if(!req.cookies.token || req.cookies.token === "") {
    res.redirect('/login');
  } else {
    let data = jwt.verify(req.cookies.token, "fhuosurhw940278trgfibsjky9428");
    req.user = data;
    next();
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});