
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session')
const passport = require("passport");
const passportLocal = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");


// const encrypt = require("mongoose-encryption");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "catinthehat",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-James:test123@cluster0-eqplp.mongodb.net/secretsDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true)

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']  });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://kuroiwa-secrets.herokuapp.com/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username: " " }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "https://kuroiwa-secrets.herokuapp.com/auth/facebook/secret"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id}, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile']}));

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/register", function(req, res){
  res.render("register");
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secret',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("./secrets", {usersWithSecrets: foundUsers})
      }
    }
  })

});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("./submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("./secrets");
      });
    }
  });
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", function(req, res){
  console.log(req.user.body);
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if (foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});

// with bcrypt

// app.post("/register", function(req, res){
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     });
//
//     newUser.save(function(err){
//       if(err){
//         console.log(err);
//       } else {
//         res.render("secrets");
//       }
//     });
//   });
// });
//
// app.post("/login", function(req, res){
//   User.findOne({email: req.body.username}, function(err, foundUser){
//     if(err){
//       console.log(err);
//     } else {
//       if(foundUser){
//         bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
//           if(result === true){
//             res.render("secrets");
//             }
//         });
//       }
//     }
//   });
// });
