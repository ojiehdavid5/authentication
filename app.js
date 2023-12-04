//jshint esversion:6
require("dotenv").config();
const express= require( 'express');
const bodyParser=require('body-parser');
const ejs=require('ejs');
const mongoose=require("mongoose");
const session= require("express-session")
const passport=require('passport');
const passportLocalMongoose=require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
var findOrCreate = require('mongoose-findorcreate');

const app=express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:process.env.SECRET ,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }));


  app.use(passport.initialize());
  app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");


const userSchema= new  mongoose.Schema({
    email:String,

    password:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User=new mongoose.model("User",userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://127.0.0.1:3000/auth/github/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ githubId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));



passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));



app.get("/" ,function(req, res) {

  res.render("home");
});


app.get("/auth/google",
passport.authenticate("google", { scope: ["profile"] })

);


app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


  app.get('/auth/github',
  passport.authenticate('github' , {scope: ["profile"]} ));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

app.get("/login" ,function(req, res) {

  res.render("login");
});
app.get("/register" ,function(req, res) {

  res.render("register");
});


app.get("/secrets",function(req,res){

  if(req.isUnauthenticated){
    res.render('secrets');

  }else{

    res.render("/login");
  }
});

app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.get("/submit",function(req,res){

  if(req.isUnauthenticated){
    res.render('submit');

  }else{

    res.render("/login");
  }
})


app.post("/register" ,function(req, res) {
  User.register({username:req.body.username, active: false}, req.body.password, function(err, user) {
    if (err) {
console.log(err);
res.redirect("/register");

     }else{

      passport.authenticate('local')(req,res, function(){
        res.redirect("/secrets");
      });
     }
  

  

})
})



app.post("/login" ,function(req, res) {

   const user=new User({

    username:req.body.username,
    password:req.body.password
   });


   req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate('local')(req,res, function(){
        res.redirect("/secrets");

    });

}});

})










app.listen(3000,function(){
  console.log("server is running on port 3000");
})
