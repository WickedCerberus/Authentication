//jshint esversion:6

require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'Our little secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = 'userDB';

(async () => {
  try {
    await mongoose.connect(`mongodb://127.0.0.1:27017/${db}`);
    console.log(`Successfully connected to database ${db}`);
  } catch (err) {
    console.error(`Failed to connect to database, ${err}`);
  }
})();

const userSchema = new Schema({
  email: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app
  .route('/')

  .get((req, res) => {
    res.render('home');
  });

app
  .route('/login')

  .get((req, res) => {
    res.render('login');
  })

  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.passport,
    });

    req.login(user, (err) => {
      if (err) {
        console.error(`Failed to login, ${err}`);
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    });
  });

app
  .route('/register')

  .get((req, res) => {
    res.render('register');
  })

  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect('/register');
        } else {
          passport.authenticate('local')(req, res, () => {
            res.redirect('/secrets');
          });
        }
      }
    );
  });

app
  .route('/secrets')

  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render('secrets');
    } else {
      res.redirect('/login');
    }
  });

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(`Logout error, ${err}`);
    }
    res.redirect('/');
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started at port 3000.`);
});
