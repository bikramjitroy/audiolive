var DOMParser = require('dom-parser');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
var md5 = require('md5');


async function mergeFiles(audioFiles, outfile) {

    let command = "sox";
    for (let i=0; i < audioFiles.length; i++ ) {
        command = command + " " +audioFiles[i];
    }
    command = command + " " + outfile;

    console.log("Command:",command);
    return exec(command).then(function(resp) {
       console.log("Converted:",outfile);
       return outfile;
    });
}

function numberToText(numberToText, numberJson) {
    let number = numberToText;

   let concat = '';
   if (number === 0) {
       console.log("ERROR:----RECORD -- ZERO");     
   }

   let lakh = parseInt(number/100000);
   //console.log(lakh, " Lakh")
   if (lakh> 0) {
      concat = String(lakh) + " lakh ";
   }
   number = number%100000;

   let thousand = parseInt(number/1000);
   //console.log(thousand, " thousand")
   if (thousand> 0) {
       concat = concat + String(thousand) + " thousand ";
   }
   number = number%1000;

   let hundred = parseInt(number/100);
   //console.log(hundred, " hundred ")
   if (hundred> 0) {
       concat = concat + String(hundred) + "-hundred ";
   }
   number = number%100;

   //console.log(number)
   if (number> 0) {
       concat = concat + String(number);
   }

   console.log("TokenText: ",numberToText, concat);
   return concat;
}

function getSSMLTokens(textForTTS) {
        
    //Collect Tokens
    let splitTokenFromInput = [];
    let tokenStartIndex = 0;
    let tokenEndIndex = 0;
    let tokenState = 0;

    let tokenOutsideStart = 0;
    let tokenOutsideEnd = 0;

    for (let i = 0; i < textForTTS.length; i++) {

        if (textForTTS[i]=== '<' && tokenState===0) {
            tokenStartIndex = i;
            tokenState = tokenState + 1;

            //This is the finish of outside token
            tokenOutsideEnd = i;
            let text = textForTTS.substring(tokenOutsideStart, tokenOutsideEnd);

            console.log(5,"TOKEN-Out:",text);

            if (text === " " || text ==="") {
                //Don't add empty tokens
            } else {
                splitTokenFromInput.push(text.trim());
            }
        }

        if (textForTTS[i]=== '>') {
            if (tokenState === 1) {
                tokenState = tokenState + 1;
                continue;
            } else {
                tokenState = 0;
            }
            tokenEndIndex = i;
            let text = textForTTS.substring(tokenStartIndex, tokenEndIndex+1);
            console.log(7,"TOKEN:",text);
            splitTokenFromInput.push(text.trim());

            //This is the new start of Outside token
            tokenOutsideStart = i + 1;
        }
    }

    if (textForTTS.length - tokenOutsideStart > 0) {
        let text = textForTTS.substring(tokenOutsideStart, textForTTS.length-1);
        console.log(textForTTS.length, tokenOutsideStart, "TOKEN-Out:",text.trim());
        if (text === " " || text ==="") {
            //Don't add empty tokens
        } else {
            splitTokenFromInput.push(text);
        }
    }

    return splitTokenFromInput;
}


function removeTag(tagStr, start, end) {
    return tagStr.replace(start,"").replace(end,"");
}

function audioFilesFromTokens(convertedText, voiceProfile, languageCode, dataFolder, dataJSON) {
    let tokens = convertedText.split(" ");
    let audioTokens = [];
    //Search by key
    for (let i = 0; i < tokens.length; i++) {
        let fullPath = "public/recordings/" + voiceProfile + "/" + languageCode + "/" + dataFolder + "/" + dataJSON[tokens[i]].filename;
        audioTokens.push(fullPath);
    }

    return audioTokens;
}

function audioFileFromText(token, voiceProfile, languageCode, dataFolder, dataJSON) {

    //Search by text
    for (var key of Object.keys(dataJSON)) {
        if (token == dataJSON[key].text) {
            let fullPath = "public/recordings/" + voiceProfile + "/" + languageCode + "/" + dataFolder + "/" + dataJSON[key].filename;
            return fullPath;
        }
    }

    return;
}

async function responseFile(ssmlText, languageCode, voiceProfile, botId, sessionId) {

    var oParser = new DOMParser();
    var oDOM = oParser.parseFromString(ssmlText);

    console.log(oDOM.getElementsByTagName('speech')[0].innerHTML); 
    let textForTTS = oDOM.getElementsByTagName('speech')[0].innerHTML;

    //NUMBER
    let numberJsonFile = "metadata/" + languageCode + "-numbers.json"; 
    let numberJson = JSON.parse(fs.readFileSync(numberJsonFile));

    //DATE
    let dateJsonFile = "metadata/" + languageCode + "-date.json"; 
    let dateJson = JSON.parse(fs.readFileSync(dateJsonFile));

    //NAME
    let nameJsonFile = "metadata/" + languageCode + "-names.json"; 
    let nameJson = JSON.parse(fs.readFileSync(nameJsonFile));

    //BOT-JSON
    let botJsonFile = "metadata/" + languageCode + "-botid-" + botId + ".json"; 
    let botJson = JSON.parse(fs.readFileSync(botJsonFile));

    let tokens = getSSMLTokens(textForTTS);
    console.log("TOKENS:-------", tokens);

    let fileConcatPromises = [];
    let tokenFiles = [];

    for (let i =0; i < tokens.length; i++) {
        let token = tokens[i];
        
        if (token.startsWith("<number>")) {
            let textWithoutTag = removeTag(token,"<number>","</number>");

            let numberText = parseInt(textWithoutTag);
            let convertedText = numberToText(numberText, numberJson);

            let outFileName = convertedText.split(" ").join('--') + ".wav";
            let outfile = "tts_final/concat_number/" + voiceProfile + "-" + languageCode + "-" + outFileName;

            //Get full path of token audio files to make it a number
            let audioFiles = audioFilesFromTokens(convertedText, voiceProfile, languageCode, "numbers", numberJson);
            fileConcatPromises.push(mergeFiles(audioFiles, outfile));
            tokenFiles.push(outfile)

        } else if (token.startsWith("<date>")) {
            let textWithoutTag = removeTag(token,"<date>","</date>");
            
            let outFileName = textWithoutTag.split(" ").join('--') + ".wav";
            let outfile = "tts_final/concat_date/" + voiceProfile + "-" + languageCode + "-" + outFileName;

            //Get full path of token audio files to make it a date
            let audioFiles = audioFilesFromTokens(textWithoutTag, voiceProfile, languageCode, "date", dateJson);
            fileConcatPromises.push(mergeFiles(audioFiles, outfile));
            tokenFiles.push(outfile)

        } else if (token.startsWith("<name>")) {
            let textWithoutTag = removeTag(token,"<name>","</name>");
            let outfile = audioFileFromText(textWithoutTag, voiceProfile, languageCode, "names", nameJson);

            tokenFiles.push(outfile);
        } else {
            //console.log(1,"OPEN-Token", token);
            let outfile = audioFileFromText(token, voiceProfile, languageCode, botId, botJson);
            //console.log(11,"OPEN-Token-OUT", outfile);
            
            tokenFiles.push(outfile);
        }
    }

    let finalOut = "tts_final/concat_final/" + voiceProfile + "-" + languageCode + "-" + botId + "-" + md5(textForTTS) + ".wav";

    return Promise.all(fileConcatPromises).then((values) => {
        console.log("Promise Return-", values);

        return mergeFiles(tokenFiles, finalOut).then(function(finalOutFilename) {
            console.log("TokenFilenames:", tokenFiles, finalOut);
            return finalOut;
        });
    });
}

//var converter = require('number-to-words');

let ssmlText = '<speech>Today we will speak <number>23596</number> <number>6</number> <number>96</number> <number>596</number> <number>3596</number> rupees on <date>29 Jul</date> </speech>';
let languageCode = "en";
let voiceProfile = "sonam";
let botId = "insurenceSales"; 
let sessionId = "merge1-";

responseFile(ssmlText, languageCode, voiceProfile, botId, sessionId).then((outvalue) =>{
    console.log("OUTVALUE", outvalue);
})
