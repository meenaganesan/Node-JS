var express = require('express')
var app = express()
var mongo = require('mongoose')
var assert = require('assert')
var bodyParser = require('body-parser')
var bcrypt = require('bcrypt')
var Schema = mongo.Schema

mongo.connect('mongodb://127.0.0.1:27017/library', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

var userData = new Schema({
  name: String,
  email: { type: String, required: true },
  password: { type: String, required: true },
  // role: String,
  booksTaken: { type: Array },
  returnedBooks: { type: Array },
  lostBooks: { type: Array }
})

var User = mongo.model('users', userData)

//  login API

app.post('/login', function (req, res, next) {
  if (Object.keys(req.body).length > 0) {
    User.find({ email: req.body.email }, function (err, docs) {
      assert.strictEqual(null, err)
      if (docs.length > 0) {
        docs.forEach(function (item, err) {
          if (bcrypt.compareSync(req.body.password, item.password)) {
            return res.status(200).send(JSON.stringify({ status: 200, message: 'Login Successfully', data: item }))
          } else {
            return res.status(400).send(JSON.stringify({ status: 'error', message: 'Password incorrect' }))
          }
        })
      } else {
        return res.status(400).send(JSON.stringify({ status: 'error', message: 'Email Id not found' }))
      }
    })
  } else {
    return res.status('400').send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

// register API

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.post('/register', function (req, res, next) {
  if (Object.keys(req.body).length > 0) {
    var item = {
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10),
      // role: 'admin',
      booksTaken: [],
      returnedBooks: [],
      booksToBeReturned: []
    }
    console.log(item)
    User.find({ email: req.body.email }).exec(function (err, data) {
      assert.strictEqual(null, err)
      if (data.length > 0) {
        return res.status(400).send(JSON.stringify({ status: 'error', message: 'Email Id already exists' }))
      } else {
        var inputData = new User(item)
        inputData.save()
        return res.status('200').send(JSON.stringify({ status: 200, message: 'Account Created Successfully', data: item }))
      }
    })
  } else {
    return res.status('400').send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

app.post('/userData', function (req, res, next) {
  if (req.body.emailId) {
    User.find({ email: req.body.emailId }).exec(function (err, data) {
      assert.strictEqual(null, err)
      if (data.length > 0) {
        return res.status(200).send(JSON.stringify({ status: 200, message: 'Retreived user data', data: data[0] }))
      } else {
        return res.status(400).send(JSON.stringify({ status: 'error', message: 'User not found.' }))
      }
    })
  } else {
    return res.status(400).send(JSON.stringify({ status: 'error', message: 'Body is required.' }))
  }
})

app.get('/userList', function (req, res, next) {
  User.find({}).limit(15)
    .exec(function (err, data) {
      assert.strictEqual(null, err)
      if (data.length > 0) {
        return res.status(200).send(JSON.stringify({ status: 200, message: 'Retreived user list', data: data }))
      } else {
        return res.status(400).send(JSON.stringify({ status: 'error', message: 'User not found.' }))
      }
    })
})

app.post('/changePassword', function (req, res, next) {
  if (req.body) {
    User.find({ email: req.body.emailId })
      .exec(function (err, result) {
        assert.strictEqual(null, err)
        if (bcrypt.compareSync(req.body.password, result[0].password)) {
          result[0].password = bcrypt.hashSync(req.body.newPassword, 10)
          result[0].save()
          return res.status(200).send(JSON.stringify({ status: 200, message: 'Changed Password successfully' }))
        }
      })
  } else {
    return res.status('400').send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

module.exports = app
