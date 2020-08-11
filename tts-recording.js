var DOMParser = require('dom-parser');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
var md5 = require('md5');
const { exception } = require('console');
const e = require('express');

const DEFAULT_MESSAGE_AUDIO = "public/tts_final/default_error_message.wav"


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
    }).catch(ex => {
        console.log("SOX ERROR:",ex.message)
        throw ex.message;
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
   concat = concat.trim();
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

            //console.log(5,"TOKEN-Out:",text);

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
            //console.log(7,"TOKEN:",text);
            splitTokenFromInput.push(text.trim());

            //This is the new start of Outside token
            tokenOutsideStart = i + 1;
        }
    }

    if (textForTTS.length - tokenOutsideStart > 0) {
        let text = textForTTS.substring(tokenOutsideStart, textForTTS.length);
        //console.log(textForTTS.length, tokenOutsideStart, "TOKEN-Out:",text.trim());
        if (text === " " || text ==="" || text.trim() === "") {
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
    console.log(1,"AudioFilesFromToken", convertedText, voiceProfile, languageCode, dataFolder)
    let tokens = convertedText.split(" ");
    let audioTokens = [];
    //Search by key
    for (let i = 0; i < tokens.length; i++) {
        let fullPath = "public/recordings/" + voiceProfile + "/" + languageCode + "/" + dataFolder + "/" + dataJSON[tokens[i]].filename;
        audioTokens.push(fullPath);
    }

    return audioTokens;
}

function audioFileFromTextEnglish(token, voiceProfile, languageCode, dataFolder, dataJSON) {

    //Search by text
    for (var key of Object.keys(dataJSON)) {
        if (token.toUpperCase() === dataJSON[key].text.toUpperCase()) {
            let fullPath = "public/recordings/" + voiceProfile + "/" + languageCode + "/" + dataFolder + "/" + dataJSON[key].filename;
            return fullPath;
        }
    }
    return;
}

function audioFileFromTextInternational(token, voiceProfile, languageCode, dataFolder, dataJSON) {

    //Search by text
    for (var key of Object.keys(dataJSON)) {
        if (token == dataJSON[key].text) {
            let fullPath = "public/recordings/" + voiceProfile + "/" + languageCode + "/" + dataFolder + "/" + dataJSON[key].filename;
            return fullPath;
        }
    }
    return;
}

function responseFile(ssmlText, languageCode, voiceProfile, botId) {

    try {
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

        var oParser = new DOMParser();
        var oDOM = oParser.parseFromString(ssmlText);

        console.log("TextForTTS:",oDOM.getElementsByTagName('speak')[0].innerHTML); 
        let textForTTS = oDOM.getElementsByTagName('speak')[0].innerHTML;
  
        let outfile = audioFileFromTextInternational(textForTTS, voiceProfile, languageCode, botId, botJson);
        if (outfile) {
            //If text exist then return the file
            var promise = new Promise(function(resolve, reject) {
                console.log("Return TextForTTS:",textForTTS, outfile, voiceProfile, languageCode, botId, botJson);
                resolve(outfile);
            });
            return promise;
        }
    
        let tokens = getSSMLTokens(textForTTS);
        console.log("TOKENS:-------", tokens);
    
        let fileConcatPromises = [];
        let tokenFiles = [];

        let promptMissing = false;
    
        for (let i =0; i < tokens.length; i++) {
            let token = tokens[i];
            
            if (token.startsWith("<number>")) {
                let textWithoutTag = removeTag(token,"<number>","</number>");
    
                let numberText = parseInt(textWithoutTag);
                let convertedText = numberToText(numberText, numberJson);
    
                let outFileName = convertedText.split(" ").join('--') + ".wav";
                let outfile = "public/tts_final/concat_number/" + voiceProfile + "-" + languageCode + "-" + outFileName;
    
                //Get full path of token audio files to make it a number
                let audioFiles = audioFilesFromTokens(convertedText, voiceProfile, languageCode, "numbers", numberJson);
                fileConcatPromises.push(mergeFiles(audioFiles, outfile));
                tokenFiles.push(outfile)
    
            } else if (token.startsWith("<date>")) {
                let textWithoutTag = removeTag(token,"<date>","</date>");
                
                let outFileName = textWithoutTag.split(" ").join('--') + ".wav";
                let outfile = "public/tts_final/concat_date/" + voiceProfile + "-" + languageCode + "-" + outFileName;
    
                //Get full path of token audio files to make it a date
                let audioFiles = audioFilesFromTokens(textWithoutTag, voiceProfile, languageCode, "date", dateJson);
                fileConcatPromises.push(mergeFiles(audioFiles, outfile));
                tokenFiles.push(outfile)
    
            } else if (token.startsWith("<name>")) {
                let textWithoutTag = removeTag(token,"<name>","</name>");
                let outfile = audioFileFromTextEnglish(textWithoutTag, voiceProfile, languageCode, "names", nameJson);

                if (outfile) {
                    tokenFiles.push(outfile);
                } else {
                    // Update the json to add this 
                    let key = md5(token);
                    nameJson[key] = {"filename":key+".wav","text":textWithoutTag}
                    let updatedBotJson = JSON.stringify(nameJson, null, 2);
                    fs.writeFileSync(nameJsonFile, updatedBotJson);
                    promptMissing = true;
                    console.log("Missing NAME token:<" + token + "> for language:" + languageCode + " of voice:"  + voiceProfile + " for bot:" + botId);
                }
            } else {
                console.log(1,"OPEN-Token", token);
                let outfile = audioFileFromTextInternational(token, voiceProfile, languageCode, botId, botJson);
                //console.log(11,"OPEN-Token-OUT", outfile);
                if (outfile) {
                    tokenFiles.push(outfile);
                } else {
                    // Update the json to add this 
                    let key = md5(token);
                    botJson[key] = {"filename":key+".wav","text":token}
                    let updatedBotJson = JSON.stringify(botJson, null, 2);
                    fs.writeFileSync(botJsonFile, updatedBotJson);
                    promptMissing = true;
                    console.log("Missing BOT token:<" + token + "> for language:" + languageCode + " of voice:"  + voiceProfile + " for bot:" + botId);
                }
            }
        }

        if (promptMissing) {
            throw new Error("Missing for language:" + languageCode + " of voice:"  + voiceProfile + " for bot:" + botId);
        }
    
        let finalOut = "public/tts_final/concat_final/" + voiceProfile + "-" + languageCode + "-" + botId + "-" + md5(textForTTS) + ".wav";
    
        return Promise.all(fileConcatPromises).then((values) => {
            console.log("Promise Return-", values);
    
            return mergeFiles(tokenFiles, finalOut).then(function(finalOutFilename) {
                console.log("TokenFilenames:", tokenFiles, finalOut);
                return finalOut;
            }).catch(ex => {
                return DEFAULT_MESSAGE_AUDIO;
            });
        });

    } catch (ex) {
        throw new Error(ex.toString());
    }
}


function responseFileModule(ssmlText, languageCode, voiceProfile, botId, dataFolder) {

    try {
        //BOT-JSON
        let botJsonFile = "metadata/" + languageCode + "-botid-" + botId + ".json"; 
        let botJson = JSON.parse(fs.readFileSync(botJsonFile));

        var oParser = new DOMParser();
        var oDOM = oParser.parseFromString(ssmlText);

        console.log(1,"TextForTTS:",oDOM.getElementsByTagName('speak')[0].innerHTML); 
        let textForTTS = oDOM.getElementsByTagName('speak')[0].innerHTML;

        let outfile = DEFAULT_MESSAGE_AUDIO;
  
        outfile = audioFileFromTextInternational(textForTTS, voiceProfile, languageCode, dataFolder, botJson);
        if (outfile) {
            //If text exist then return the file
        } else {
            //COMMON-JSON
            console.log(2,"Checking Common",textForTTS)
            let commonFile = "metadata/" + languageCode + "-common.json"; 
            let commonJson = JSON.parse(fs.readFileSync(commonFile));
            
            outfile = audioFileFromTextInternational(textForTTS, voiceProfile, languageCode, 'common', commonJson);
        }

        var promise = new Promise(function(resolve, reject) {
            console.log(3,"Return TextForTTS:", textForTTS, outfile, voiceProfile, languageCode, botId, dataFolder);
            resolve(outfile);
        });
        return promise;

    } catch (ex) {
        throw new Error(ex.toString());
    }
}




//var converter = require('number-to-words');

// let ssmlText = '<speech>Today we will speak <name>mister bikramjit</name> <number>23596</number> <number>6</number> <number>96</number> <number>596</number> <number>3596</number> rupees on <date>29 Jul</date> </speech>';
// let languageCode = "en";
// let voiceProfile = "sonam";
// let botId = "insurenceSales"; 

// responseFile(ssmlText, languageCode, voiceProfile, botId).then((outvalue) =>{
//     console.log("OUTVALUE", outvalue);
// }).catch(ex => {
//     console.log("ERROR", ex.message)
// });

module.exports = {
    responseFile,
    responseFileModule,
}
