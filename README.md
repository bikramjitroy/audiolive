# RecordingAndTrim

Pass this from URL to save recordings
URL:  http://localhost:8090/?languageCode=en&recorderName=bikram&botID=insurenceSales

languageCode=en
recorderName=bikram
botID=insurenceSales

Data Stored in :
metadata/<languageCode>-names.json
metadata/<languageCode>-date.json
metadata/<languageCode>-numbers.json
metadata/<languageCode>-botid-<botID>.json

for every bot and language create file:
metadata/<languageCode>-botid-<botID>.json

for every recorder name   create folders under 

"public/recordings/<recorderName>/<languageCode>/names/"
"public/recordings/<recorderName>/<languageCode>/date/"
"public/recordings/<recorderName>/<languageCode>/numbers/"

Recording for specific bot
"public/recordings/<recorderName>/<languageCode>/<botID>/"

Pass this from URL to save recordings
