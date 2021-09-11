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

var peerIdList = [];

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream).then(function () {

    myPeer.on('call', call => {
      call.answer(stream)
      if (peers[call.peer] == undefined) {
        const video = document.createElement('video');

        peers[call.peer] = call;

        call.on('stream', userVideoStream => {
          addVideoStream(video, userVideoStream)
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
  if (joinButton) {
    joinButton.addEventListener("click", function () {
      if (peerId && !joined) {
        joined = true;
        joinButton.style.display = "none";
        setTimeout(() => {
          socket.emit('join-room', ROOM_ID, peerId);
        }, 1000);
      }
    })
  }
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
  }
})

myPeer.on('open', id => {
  peerId = id;
})

function connectToNewUser(userId, stream) {
  if (peers[userId] == undefined) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')

    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
      video.remove();
      delete peers[userId];
    })

    peers[userId] = call
  }
}

function addVideoStream(video, stream) {
  return new Promise(function (resolve, reject) {
    video.srcObject = stream
    videoGrid.append(video);
    video.addEventListener('loadedmetadata', () => {
      video.play();
      resolve(video);
    })
  });
}