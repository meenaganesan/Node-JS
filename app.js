var express = require('express')
var bodyParser = require('body-parser')

var app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const index = require('./routes/index')
const bookList = require('./routes/bookList')

app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use('/', index)
app.use('/bookList', bookList)

const port = process.env.PORT || 5000
console.log(port)
app.listen(port, () => console.log('server listening ... 4000'))

module.exports = app
