require('log-timestamp');
const https = require('https');
var express = require("express");
const bodyParser = require('body-parser');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const multer  = require('multer'); //use multer to upload blob data
const upload = multer(); // set multer to be the upload variable (just like express, see above ( include it, then use it/set it up))
const fs = require('fs');

var path = require("path");
const ttsFromRecording = require("./tts-recording.js")

const APP_PORT = 2402;
const APP_HTTP_PORT = 2403;
var ASTERISK_PATH = "/dacx/var/ameyo/dacxdata/asap/var/lib/asterisk/sounds/en/"


var app = express();

app.use(express.static('public'));
app.use('/audio', express.static(__dirname + '/public/audio'));
//app.use(bodyParser.urlencoded({ extended: true }));
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json();


app.post('/uploadfile', upload.single('soundBlob'), function (req, res, next) {
  console.log(req.body.duration, req.body.startTime); // see what got uploaded
  

  let basePath = 'public/uploads/';
  let uploadLocation = __dirname + '/' + basePath + req.file.originalname + ".webm"; // where to save the file to. make sure the incoming name has a .wav extension
  console.log("ST", req.file.startTime, req.endTime);

  //fs.writeFileSync(uploadLocation, Buffer.from(new Uint8Array(req.file.buffer)),{flag:'w'}); // write the blob to the server as a file
  fs.writeFileSync(uploadLocation, req.file.buffer,{flag:'w'}); // write the blob to the server as a file

  let filePath = basePath + req.file.originalname;
  let convertCommand = 'ffmpeg -y -i ' + filePath + '.webm -ar 8000 -acodec pcm_s16le ' + filePath + '.wav';

  console.log("ConvertCommand:",convertCommand);

  const exec = require('child_process').exec;
  exec(convertCommand, (err, stdout, stderr) => {
      res.send("uploads/" + req.file.originalname + ".wav");
      //let trimCommand = 'sox ' + filePath + '.wav ' + filePath + '-trim.wav trim ' + req.body.startTime + ' ' + req.body.duration
      //exec(trimCommand, (error, stdoutt, stderrr) => {
      ////process.stdout.write(stdout);
      //    res.send("uploads/" + req.file.originalname + "-trim.wav"); //send back that everything went ok
      //})	      
  });

});

app.post('/process', urlencodedParser,function (req, res) {
  console.log('Got from data process:', req.body);
  
  let dstFile = req.body.userName;
  let dstFileTrim = 'uploads/currentFile-' + dstFile + '-trim.wav';

  let command = 'sox public/' + req.body.srcAudioName + ' public/' + dstFileTrim + ' trim ' +  req.body.startTime + ' ' + req.body.duration;
  console.log("Command:",command);
  exec(command).then(function(resp) {
	 console.log("Response:",dstFileTrim);
	 res.send(dstFileTrim);
  });
});

app.post('/uploadPrompt', urlencodedParser, function (req, res) {
  console.log('Got from data uploadPrompt:', req.body);

  var onlyPath = require('path').dirname('public/' + req.body.fullPath);
  if (!fs.existsSync(onlyPath)){
      fs.mkdirSync(onlyPath, {recursive: true});
  }
  
  let command = 'cp public/' + req.body.fromFile + ' public/' + req.body.fullPath;
  console.log("Command:",command);
  exec(command).then(function(resp) {
         console.log("Response:", resp);
         res.send(req.body.fullPath);
  });
});




app.post('/dates', jsonParser, function (req, res) {
  console.log('Got from data- dates:', req.body);
  
  let language = req.body.language;
  let user = req.body.user;
  let folder = '/date/';
  let filename = 'metadata/' + language + "-date.json";

  let rawdata = fs.readFileSync(filename);
  let rawJson = JSON.parse(rawdata);
  let updatedJson = JSON.parse(rawdata);

  for (var promptKey in rawJson){
      let path = 'public/recordings/' + user + '/' + language + folder + rawJson[promptKey]['filename'];

      updatedJson[promptKey]['fileExist'] = false;
      try {
          if (fs.existsSync(path)) {
              updatedJson[promptKey]['fileExist'] = true;
          }
      } catch(err) {
          console.error(err);
      }
  }

  //console.log(updatedJson);
  res.send(updatedJson);
});

app.post('/numbers', jsonParser, function (req, res) {
  console.log('Got from data- numbers:', req.body);
  
  let language = req.body.language
  let user = req.body.user
  let folder = '/numbers/'
  let filename = 'metadata/' + language + "-numbers.json"

  let rawdata = fs.readFileSync(filename);
  let rawJson = JSON.parse(rawdata);
  let updatedJson = JSON.parse(rawdata);

  for (var promptKey in rawJson){
      let path = 'public/recordings/' + user + '/' + language + folder + rawJson[promptKey]['filename']

      updatedJson[promptKey]['fileExist'] = false
      try {
          if (fs.existsSync(path)) {
              updatedJson[promptKey]['fileExist'] = true
          }
      } catch(err) {
          console.error(err)
      }
  }

  //console.log(updatedJson)
  res.send(updatedJson)
})

app.post('/names', jsonParser, function (req, res) {
  console.log('Got from data- names:', req.body);
  
  let language = req.body.language
  let user = req.body.user
  let folder = '/names/'
  let filename = 'metadata/' + language + "-names.json"

  let rawdata = fs.readFileSync(filename);
  let rawJson = JSON.parse(rawdata);
  let updatedJson = JSON.parse(rawdata);

  for (var promptKey in rawJson){
      let path = 'public/recordings/' + user + '/' + language + folder + rawJson[promptKey]['filename']

      updatedJson[promptKey]['fileExist'] = false
      try {
          if (fs.existsSync(path)) {
              updatedJson[promptKey]['fileExist'] = true
          }
      } catch(err) {
          console.error(err)
      }
  }

  //console.log(updatedJson)
  res.send(updatedJson)
})


app.post('/botData', jsonParser, function (req, res) {
  console.log('Got from data- botData:', req.body);
 
  let language = req.body.language
  let user = req.body.user

  let botId = req.body.botId
  let folder = '/'+botId+'/'
  let filename = 'metadata/' + language + "-botid-" + botId + ".json"

  let rawdata = fs.readFileSync(filename);
  let rawJson = JSON.parse(rawdata);
  let updatedJson = JSON.parse(rawdata);

  for (var promptKey in rawJson){
      let path = 'public/recordings/' + user + '/' + language + folder + rawJson[promptKey]['filename']

      updatedJson[promptKey]['fileExist'] = false
      try {
          if (fs.existsSync(path)) {
              updatedJson[promptKey]['fileExist'] = true
          }
      } catch(err) {
          console.error(err)
      }
  }

  //console.log(updatedJson)
  res.send(updatedJson)
})


app.post('/liveTTS', urlencodedParser, function (req, res) {
    console.log('Live TTS: Request', req.body);
   
    let ssmlText = req.body.ssml
    let languageCode = req.body.language;
    //let languageCode = language.substring(1,3);
    
    let botId = req.body.botId; 
 
    // Based on language select voice profile
    //VOICE PROFILE
    let voiceProfileJsonFile = "metadata/default_voice_profile.json"; 
    let voiceProfileJson = JSON.parse(fs.readFileSync(voiceProfileJsonFile));
    let voiceProfile = voiceProfileJson[languageCode];

    console.log(1,"TTS Live Data:", ssmlText, languageCode, voiceProfile, botId);

    if (voiceProfile === 'bhagwat-record') {
        let dataFolder = botId;
        botId = botId + '_bhagwat-record';


        ttsFromRecording.responseFileModule(ssmlText, languageCode, voiceProfile, botId, dataFolder).then((outvalue) =>{
            console.log("OUTVALUE-RESPONSE-FILE", outvalue);

            let command = 'cp ' + outvalue + ' ' + ASTERISK_PATH;
            console.log("Copy Command:",command);
            exec(command).then(function(resp) {
                   console.log("Response:", resp);
                   var extension = path.extname(outvalue);
                   var exactFile = path.basename(outvalue,extension);
                   res.send(exactFile);
            });

        }).catch(ex => {
            console.log("ERROR", ex.message)
        });

    } else {

        ttsFromRecording.responseFile(ssmlText, languageCode, voiceProfile, botId).then((outvalue) =>{
            console.log("OUTVALUE-RESPONSE-FILE", outvalue);

            let command = 'cp ' + outvalue + ' ' + ASTERISK_PATH;
            console.log("Copy Command:",command);
            exec(command).then(function(resp) {
                   console.log("Response:", resp);
                   var extension = path.extname(outvalue);
                   var exactFile = path.basename(outvalue,extension);
                   res.send(exactFile);
            });

        }).catch(ex => {
            console.log("ERROR", ex.message)
        });
    }

});




var privateKey = fs.readFileSync('configs/sslcert_2020/CER/_.emerge', 'utf8')
var certificate = fs.readFileSync('configs/sslcert_2020/CER/STAR_ameyoemerge_in.crt', 'utf8')
var caBundle = fs.readFileSync('configs/sslcert_2020/CER/My_CA_Bundle.ca-bundle')
var credentials = { key: privateKey, cert: certificate, ca: caBundle }


var httpsServer = https.createServer(credentials, app);
httpsServer.listen(APP_PORT, function(){
    console.log("Server https://voicebotdemo.ameyoemerge.in:%s", APP_PORT);
});

const http = require('http')
var httpsServer = http.createServer(app);
httpsServer.listen(APP_HTTP_PORT, function(){
    console.log("Server http://localhost:%s", APP_HTTP_PORT);
});


