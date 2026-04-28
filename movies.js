var express = require("express")
var app = express()
var path = require("path")
var public_html = __dirname

app.use(express.json())

app.get('/movies', function(req, res) {
    res.sendFile(path.join(__dirname, "movies.html"))
})

app.get('/movies-json', function(req, res) {
    res.sendFile(path.join(__dirname, "movies.json"))
})

app.post('/cart', function(req, res) {
    console.log("Movie added to cart")
})

app.listen(8080, function() {
    console.log("Server running...")
})