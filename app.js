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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook');

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
  googleId: String,
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, cb) => {
  process.nextTick(() => {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser((user, cb) => {
  process.nextTick(() => {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/login/federated/facebook/secrets',
      state: true,
    },
    function verify(accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app
  .route('/')

  .get((req, res) => {
    res.render('home');
  });

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/secrets');
  }
);

app.get('/login/federated/facebook', passport.authenticate('facebook'));

app.get(
  '/login/federated/facebook/secrets',
  passport.authenticate('facebook', {
    successRedirect: '/secrets',
    failureRedirect: '/login',
  })
);

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

  .get(async (req, res) => {
    try {
      const users = await User.find({ secret: { $ne: null } });
      if (users) {
        res.render('secrets', { usersWithSecrets: users });
      }
    } catch (err) {
      console.error(err);
    }
  });

app
  .route('/submit')

  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render('submit');
    } else {
      res.redirect('/login');
    }
  })

  .post(async (req, res) => {
    try {
      const userSecret = req.body.secret;

      const user = await User.findById(req.user.id);
      if (user) {
        user.secret = userSecret;
        await user.save();
        res.redirect('/secrets');
      }
    } catch (err) {
      console.error(err);
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
