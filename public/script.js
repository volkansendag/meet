const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: 'meet.volkansendag.com',
  port: "443",
  path: '/pr'
})

const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
var joined = false;

var peerId;
var opened = false;

var videoList = [];

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream, myVideo.id).then(function () {

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
})

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
      joinButton.style.display = "block";
      disconnectButton.style.display = "none";
      socket.emit('disconnect-room', ROOM_ID, peerId);
      removeAllVideos();
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
    video.srcObject = stream
    videoGrid.append(video);
    videoList.push({
      id: id,
      video: video
    });

    video.addEventListener('loadedmetadata', () => {
      video.play();
      resolve(video);
    })
  });
}

function removeAllVideos() {
  videoList.filter(p => p.id != peerId && p.video).forEach(item => item.video.remove());
}

function removeVideo(id) {
  videoList.filter(p => p.id == id && p.video).forEach(item => item.video.remove());
}