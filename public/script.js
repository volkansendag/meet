const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const videoElement = document.querySelector('video');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
const myVideo = document.createElement('video')

// const myPeer = new Peer(undefined, {
//   host: 'meet.volkansendag.com',
//   port: "443",
//   path: '/pr'
// })

const myPeer = new Peer()

myVideo.muted = true
const peers = {}
var joined = false;

var peerId;
var opened = false;

var videoList = [];


window.addEventListener("load", function (v) {
  var joinButton = document.getElementById("join");
  var disconnectButton = document.getElementById("disconnect");
  if (joinButton) {
    joinButton.addEventListener("click", function () {
      if (peerId && !joined) {
        joined = true;
        joinButton.style.display = "none";
        disconnectButton.style.display = "block";
        socket.emit('join-room', ROOM_ID, peerId);
      }
    })
  }
  if (disconnectButton) {
    disconnectButton.addEventListener("click", function () {
      if (peerId && joined) {
        joined = false;
        joinButton.style.display = "block";
        disconnectButton.style.display = "none";
        socket.emit('disconnect-room', ROOM_ID, peerId);
        removeAllVideos();
      }
    })
  }
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
  }
  removeVideo(userId);
})

myPeer.on('open', id => {
  peerId = id;
})

function connectToNewUser(userId, stream) {
  if (peers[userId] == undefined) {

    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')

    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream, userId)
    })
    call.on('close', () => {
      video.remove();
      delete peers[userId];
    })

    peers[userId] = call
  }
}

function addVideoStream(video, stream, id) {
  return new Promise(function (resolve, reject) {
    window.stream = stream;
    video.srcObject = stream
    videoGrid.append(video);

    addVoiceAnalyser(stream);
    addVideo(id, video);

    video.addEventListener('loadedmetadata', () => {
      video.play();
      resolve(video);
    })
  });
}

function addVoiceAnalyser(stream) {
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  microphone = audioContext.createMediaStreamSource(stream);
  javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

  analyser.smoothingTimeConstant = 0.8;
  analyser.fftSize = 1024;

  microphone.connect(analyser);
  analyser.connect(javascriptNode);
  javascriptNode.connect(audioContext.destination);
  javascriptNode.onaudioprocess = function() {
      var array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      var values = 0;

      var length = array.length;
      for (var i = 0; i < length; i++) {
        values += (array[i]);
      }

      var average = values / length;

    //console.log(Math.round(average));
    colorPids(average);
  }


  function colorPids(vol) {
    let all_pids = document.querySelectorAll('.pid');
    all_pids = Array.from(all_pids);
    let amout_of_pids = Math.round(vol/10);
    let elem_range = all_pids.slice(0, amout_of_pids)
    for (var i = 0; i < all_pids.length; i++) {
      all_pids[i].style.backgroundColor="#e6e7e8";
    }
    for (var i = 0; i < elem_range.length; i++) {
  
      // console.log(elem_range[i]);
      elem_range[i].style.backgroundColor="#69ce2b";
    }
  }

}

function removeAllVideos() {
  videoList.filter(p => p.id != myPeer.id && p.video).forEach(item => item.video.remove());
}

function removeVideo(id) {
  videoList.filter(p => p.id == id && p.video).forEach(item => item.video.remove());
  videoList = videoList.filter(p => p.id != id);
}

function addVideo(id, video) {
  if (!videoList.some(p => p.id == id)) {
    videoList.push({
      id: id,
      video: video
    });
    // removeVideo(id);
  }

}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(videoElement, audioDestination);
}

function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId}`);
        })
        .catch(error => {
          let errorMessage = error;
          if (error.name === 'SecurityError') {
            errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
          }
          console.error(errorMessage);
          // Jump back to first output device in the list as it's the default.
          audioOutputSelect.selectedIndex = 0;
        });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function getDeviceList(deviceInfos) {
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

function startVideo(stream) {

  addVideoStream(myVideo, stream, myPeer.id).then(function () {

    myPeer.on('call', call => {
      call.answer(stream)
      if (peers[call.peer] == undefined) {
        const video = document.createElement('video');

        peers[call.peer] = call;

        call.on('stream', userVideoStream => {
          addVideoStream(video, userVideoStream, call.peer)
        })
      }
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream)
    })
  })

  return navigator.mediaDevices.enumerateDevices();
}

function startMedia(params) {  
  if (window.stream) {
      window.stream.getTracks().forEach(track => {
        track.stop();
      });
      stream = window.stream;
  }

  var audioSource = audioInputSelect.value;
  var videoSource = videoSelect.value;
  const constraints = {
    audio: {deviceId: audioSource ? {exact: audioSource} : true},
    video: {deviceId: videoSource ? {exact: videoSource} : true}
  };

  navigator.mediaDevices.getUserMedia(constraints).then(startVideo).then(getDeviceList)
}

audioInputSelect.onchange = startMedia;
audioOutputSelect.onchange = changeAudioDestination;

startMedia();