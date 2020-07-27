var DOMParser = require('dom-parser');
var converter = require('number-to-words');

function numberVsAudioFile(number) {
   console.log("Number To Word:",converted)

   let concat = ''
   if (number === 0) {
       console.log("RECORD -- ZERO")       
   }

   let lakh = parseInt(number/100000)
   //console.log(lakh, " Lakh")
   if (lakh> 0) {
      concat = String(lakh) + " lakh "
   }
   number = number%100000 

   let thousand = parseInt(number/1000)
   //console.log(thousand, " thousand")
   if (thousand> 0) {
       concat = concat + String(thousand) + " thousand "
   }
   number = number%1000

   let hundred = parseInt(number/100)
   //console.log(hundred, " hundred ")
   if (hundred> 0) {
       concat = concat + String(hundred) + "-hundred "
   }
   number = number%100

   //console.log(number)
   if (number> 0) {
       concat = concat + String(number)
   }

   console.log(concat)
}

function processNumbers(allNumbers) {
    audioSegments = []
    for (let i=0; i < allNumbers.length; i++) {
         let number = parseInt(allNumbers[i].innerHTML);
         numberVsAudioFile(number) 
    }
}




function responseFile(ssmlText, languageCode, voiceProfile, botId, sessionId) {
    var oParser = new DOMParser();
    var oDOM = oParser.parseFromString(ssmlText);
    // print the name of the root element or error message
    //console.log(oDOM.documentElement.speech == "parsererror" ? "error while parsing" : oDOM.documentElement.speech); 
    console.log(oDOM.getElementsByTagName('speech')[0].innerHTML); 
    let textForTTS = oDOM.getElementsByTagName('speech')[0].innerHTML

    
    console.log(oDOM.getElementsByTagName("number")[0].innerHTML); 

    let allNumbers = oDOM.getElementsByTagName("number")
    processNumbers(allNumbers) 



    console.log(oDOM.getElementsByTagName("date")[0].innerHTML); 
}

let ssmlText = '<speech>Today we will spech <number>23596</number> <number>6</number> <number>96</number> <number>596</number> <number>3596</number> rupees on <date>29 July</date></speech>';
let languageCode = "en"
let voiceProfile = "sonam"
let botId = "insurenceSales" 
let sessionId = "merge1-"
responseFile(ssmlText, languageCode, voiceProfile, botId, sessionId)
