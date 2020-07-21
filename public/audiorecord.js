let shouldStop = false;
let stopped = false;


function fromBlobToWav(soundBlob, wavesurfer, startTime, endTime) {
  var formdata = new FormData();
  let tempFileName = "currentFile-" + userName + "-" + language
  formdata.append("soundBlob", soundBlob, tempFileName);
  formdata.append("startTime", startTime);
  formdata.append("duration", endTime-startTime);

  $.ajax({
      url: "/uploadfile",
      type: "POST",
      data: formdata,
      processData: false,
      contentType: false,
  }).done(function(respond) {
      recordingToWavFilePath = respond;
      trimWavFilePath = recordingToWavFilePath
      wavesurfer.load(recordingToWavFilePath);
      //  alert(respond);
  });
}

function trimRecording(filepath, startTime, endTime, wavesurferTrim, username) {
  $.post("/process",
  {
      srcAudioName: filepath,
      startTime: startTime,
      endTime: endTime,
      duration: (endTime-startTime).toFixed(2),
      userName: username
  },
  function(data, status){
      //alert("Data: " + data + "\nStatus: " + status);
      trimWavFilePath = data;
      wavesurferTrim.load(trimWavFilePath);
  });
}


function uploadRecording(currentDisplayPrompt, trimWavFilePath) {
  let jsonData = JSON.parse(JSON.stringify(currentDisplayPrompt))
  jsonData["fromFile"] = trimWavFilePath
  $.post("/uploadPrompt",
    jsonData,
    function(data, status){
      alert("Data: " + data + "\nStatus: " + status);
  });
}

function startStopRecording(startStopRecordingButton, callbackPostRecord) {

    startStopRecordingButton.addEventListener('click', function() {
        if (shouldStop === false) {
            shouldStop = true;
            stopped = true
            $(this).removeClass('btn-primary').addClass('btn-danger');
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(handleSuccess);

        } else {
            shouldStop = true
            stopped = false
            $(this).removeClass('btn-danger').addClass('btn-primary');
        }
    });
    
    const handleSuccess = function(stream) {
        const options = {mimeType: 'audio/webm'};
        const recordedChunks = [];
        const mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.addEventListener('dataavailable', function(e) {
          if (e.data.size > 0) {
            recordedChunks.push(e.data);
          }

          if (shouldStop === true && stopped === false) {
            mediaRecorder.stop();
            shouldStop = false
            stopped = true;
          }
        });

        mediaRecorder.addEventListener('stop', function() {
          let soundBlob = new Blob(recordedChunks, { 'type' : 'audio/wav; codecs=MS_PCM' });
          callbackPostRecord(soundBlob);
        });
        // Trigger data available every 100 ms
        mediaRecorder.start(100);
    };
}


