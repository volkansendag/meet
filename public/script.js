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

var peerId;
var opened = false;

var peerIdList = [];

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream).then(function () {

    if (peerId && !peerIdList.some(p => p == peerId)) {
      peerIdList.push(peerId);
    }

    if (peerId) {
      socket.emit('join-room', ROOM_ID, peerId);
    }

    myPeer.on('call', call => {
      call.answer(stream)
      const video = document.createElement('video')
      call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
      })
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream)
    })

  })


})

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close()
  }
})

myPeer.on('open', id => {
  peerId = id;
  socket.emit('join-room', ROOM_ID, peerId);

  if (!peerIdList.some(p => p == peerId)) {
    peerIdList.push(peerId);
  }
  console.log(id);
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    if (!peerIdList.some(p => p == peerId)) {
      peerIdList.push(peerId);
    }
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove();
    peerIdList = peerIdList.filter(p => p !== userId)
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  return new Promise(function (resolve, reject) {
    video.srcObject = stream
    videoGrid.append(video);
    video.addEventListener('loadedmetadata', () => {
      video.play();
      console.log(videoGrid);
      resolve(video);
    })
  });
}