//jshint esversion:6

require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const md5 = require('md5');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

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

const User = model('User', userSchema);

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

  .post(async (req, res) => {
    try {
      const username = req.body.username;
      const password = md5(req.body.password);

      const foundUser = await User.findOne({ email: username });
      if (foundUser) {
        if (foundUser.password === password) {
          res.render('secrets');
        } else {
          res.send('Wrong Password');
        }
      } else {
        res.send('Could not find User');
      }
    } catch (err) {
      console.error(`Failed to login user, ${err}`);
    }
  });

app
  .route('/register')

  .get((req, res) => {
    res.render('register');
  })

  .post(async (req, res) => {
    try {
      const newUser = await User.create({
        email: req.body.username,
        password: md5(req.body.password),
      });

      res.render('secrets');
    } catch (err) {
      console.error(`Failed to add user, ${err}`);
    }
  });

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started at port 3000.`);
});
