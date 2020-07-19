var express = require('express')
var app = express()
var mongo = require('mongoose')
var assert = require('assert')
var moment = require('moment')
var Schema = mongo.Schema

mongo.connect('mongodb://127.0.0.1:27017/library', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

var bookData = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: String, required: true },
  volume: String,
  edition: String,
  categories: String,
  pages: { type: String },
  description: String,
  bookedBy: Object,
  reservedBy: String,
  id: Number
})

var booksTakenData = new Schema({
  book: bookData,
  takenBy: { type: String, required: true },
  pickedDate: { type: String, required: true }
})

var Books = mongo.model('books', bookData)

var BooksTaken = mongo.model('booksTaken', booksTakenData)

var User = mongo.models.users

// API for retrieving book list
app.get('/', function (req, res, next) {
  var nextData = false
  Books.find({}).limit(15).sort({ title: 1 })
    .exec(function (err, doc) {
      if (err) {
        return res.status(400).send(JSON.stringify({ status: 400, message: 'error' }))
      } else {
        if (doc.length === 15) { nextData = true }
        return res.status(200).send(JSON.stringify({ status: 200, message: 'success', hasNext: nextData, data: doc }))
      }
    })
})

// API for total count of the book available
app.get('/totalCount', function (req, res, next) {
  Books.countDocuments({}, function (err, number) {
    assert.strictEqual(null, err)
    return res.status(200).send(JSON.stringify({ status: 200, message: 'success', data: number }))
  })
})

// API for  admin to delete the book
app.post('/deleteBooks', function (req, res, next) {
  Books.deleteMany({ title: { $in: req.body } }, function (err, data) {
    assert.strictEqual(null, err)
    return res.status(200).send(JSON.stringify({ status: 200, message: 'Deleted Successfully' }))
  })
})

// API for admin to add the book
app.post('/addBook', function (req, res, next) {
  if (Object.keys(req.body).length > 0) {
    req.body.id = Math.floor(Math.random() * 1000)
    var data = new Books(req.body)
    data.save()
    return res.status(200).send(JSON.stringify({ status: 200, message: 'Book added Successfully' }))
  } else {
    return res.status(400).send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

// API for book list pagination
app.post('/loadMore', function (req, res, next) {
  var nextData = false
  if (req.body.skip) {
    Books.find().skip(req.body.skip).limit(10)
      .exec(function (err, data) {
        assert.strictEqual(null, err)
        if (data.length === 10) {
          nextData = true
        }
        return res.status(200).send(JSON.stringify({ status: 200, message: 'success', hasNext: nextData, data: data }))
      })
  }
})

// API for user to get a book
app.post('/getBook', function (req, res, next) {
  if (req.body.bookId) {
    Books.find({ id: req.body.bookId })
      .exec(function (err, data) {
        assert.strictEqual(null, err)
        if (data.length > 0) {
          data[0].bookedBy = { email: req.body.emailId, expectedReturnDate: moment().add(1, 'days').format('MM/DD/YYYY') }
          data[0].save()
          const item = { book: data[0], takenBy: req.body.emailId, pickedDate: moment().format('MM/DD/YYYY') }
          var newData = new BooksTaken(item)
          newData.save()
          User.find({ email: req.body.emailId })
            .exec(function (err, user) {
              assert.strictEqual(null, err)
              var item = {
                book: data[0],
                expectedReturnDate: moment().add(1, 'days').format('MM/DD/YYYY'),
                pickedTime: moment().format('MM/DD/YYYY')
              }
              user[0].booksTaken.push(item)
              user[0].save()
            })
          return res.status(200).send(JSON.stringify({ status: 200, message: 'Now you can go collect your book.' }))
        }
      })
  } else {
    return res.status(400).send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

// API for returning the reserved book
app.post('/returnBook', function (req, res, next) {
  var message = ''
  if (req.body.bookId) {
    Books.find({ id: req.body.bookId })
      .exec(function (err, data) {
        assert.strictEqual(null, err)
        if (data.length > 0) {
          if (data[0].reservedBy && data[0].reservedBy === '') {
            data[0].bookedBy = ''
          } else {
            data[0].bookedBy = { email: data[0].reservedBy, expectedReturnDate: moment().add(1, 'days').format('MM/DD/YYYY') }
          }
          // data[0].save()
          User.find({ email: req.body.emailId })
            .exec(function (err, user) {
              assert.strictEqual(null, err)
              var item = {
                book: data[0],
                returnedTime: moment().format('MM/DD/YYYY')
              }
              user[0].booksTaken = user[0].booksTaken.filter(element => {
                if (element.book.id !== req.body.bookId) {
                  return true
                } else {
                  message = 'You have returned the book sucessfully'
                  if (!data[0].reservedBy || data[0].reservedBy === '') {
                    BooksTaken.deleteOne({ book: element.book }).exec(function (err, data) { assert.strictEqual(null, err); console.log('deleted') })
                  } else {
                    BooksTaken.find({ book: element.book })
                      .exec(function (err, docs) {
                        assert.strictEqual(null, err)
                        if (docs.length > 0) {
                          docs[0].book.bookedBy = { email: data[0].reservedBy, expectedReturnDate: moment().add(1, 'days').format('MM/DD/YYYY') }
                          docs[0].takenBy = data[0].reservedBy
                          docs[0].pickedDate = moment().format('MM/DD/YYYY')
                          docs[0].save()
                        }
                      })
                  }
                  data[0].reservedBy = ''
                  data[0].save()
                  if (req.body.collectFine) {
                    const date = moment(element.expectedReturnDate)
                    item.fine = moment().diff(date, 'hours') * 10
                    message = 'Book has been returned please collect the fine amount of ' + item.fine + ' rupees from user.'
                  }
                  item.pickedTime = element.pickedTime
                  return false
                }
              })
              user[0].returnedBooks.push(item)
              user[0].save()
              return res.status(200).send(JSON.stringify({ status: 200, message: message }))
            })
        }
      })
  } else {
    return res.status(400).send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

// API for issued books

app.get('/issuedBooks', function (req, res, next) {
  BooksTaken.find({})
    .exec(function (err, docs) {
      assert.strictEqual(null, err)
      return res.status(200).send(JSON.stringify({ status: 200, message: 'Retrieved issued books list', data: docs }))
    })
})

// API for lost books

app.post('/bookLost', function (req, res, next) {
  if (req.body.bookId) {
    Books.find({ id: req.body.bookId })
      .exec(function (err, data) {
        assert.strictEqual(null, err)
        User.find({ email: req.body.emailId })
          .exec(function (err, user) {
            assert.strictEqual(null, err)
            var item = {
              book: data[0],
              returnedTime: moment().format('MM/DD/YYYY'),
              lostBy: req.body.emailId
            }
            user[0].booksTaken = user[0].booksTaken.filter(element => {
              if (element.book.id !== req.body.bookId) {
                return true
              } else {
                BooksTaken.deleteOne({ book: element.book }).exec(function (err, data) { assert.strictEqual(null, err); console.log('deleted') })
                Books.deleteOne({ id: req.body.bookId }).exec(function (err, data) { assert.strictEqual(null, err); console.log('deleted book') })
                item.pickedTime = element.pickedTime
                return false
              }
            })
            user[0].returnedBooks.push(item)
            user[0].save()
            return res.status(200).send(JSON.stringify({ status: 200, message: 'Deleted the book succesfully from database. Collect a fine of 500 rupees from the user' }))
          })
      })
  }
})

app.post('/reserveBook', function (req, res, next) {
  if (req.body.bookId) {
    Books.find({ id: req.body.bookId })
      .exec(function (err, data) {
        assert.strictEqual(null, err)
        if (data.length > 0) {
          data[0].reservedBy = req.body.emailId
          data[0].save()
          return res.status(200).send(JSON.stringify({ status: 200, message: 'Reserved the book for you.' }))
        }
      })
  } else {
    return res.status(400).send(JSON.stringify({ status: 'error', message: 'Body is required' }))
  }
})

module.exports = app
