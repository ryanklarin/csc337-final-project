var express = require("express")
var app = express()
var path = require("path")
var fs = require("fs")

app.get("/order", function(req, res) {
    res.sendFile(path.join(__dirname, "order.html"))
})

app.post("/orderACTION", express.json(), function(req, res) {
    var orders = JSON.parse(fs.readFileSync("orders.json", {"encoding":"utf8"}))
    orders.push({
        movie:req.body.movie,
        shipping:req.body.shipping,
        ccn:req.body.ccn,
        ccv:req.body.ccv,
        expDate:req.body.expDate,
        addressLine:req.body.addressLine,
        city:req.body.city,
        state:req.body.state,
        zip:req.body.zip
    })
    try {
        fs.writeFileSync("orders.json", JSON.stringify(orders, null, 2), {"encoding":"utf8"})
    } catch(err) {
        console.log(err)
    }
    res.sendFile(path.join(__dirname, "orderConfirmation.html"))
})

app.listen(8080, function() {console.log("Server started ...")})