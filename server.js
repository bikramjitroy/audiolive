var express = require("express");
const bodyParser = require('body-parser');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

var app = express();

app.use(express.static('public'));
app.use('/audio', express.static(__dirname + '/public/audio'));
app.use(bodyParser.urlencoded({ extended: true }));


app.post('/process', function (req, res) {
  console.log('Got from data:', req.body);
  
  let command = 'sox public/' + req.body.srcAudioName + ' public/' + req.body.dstAudioName + ' trim ' +  req.body.startTime + ' ' + req.body.duration
  console.log("Command:",command)
  exec(command).then(function(resp) {
	 console.log("Response:",resp)
	 res.send('Data-Received')
  });
})

var server = app.listen(8090, function(){
    var port = server.address().port;
    console.log("Server http://localhost:%s", port);
});
