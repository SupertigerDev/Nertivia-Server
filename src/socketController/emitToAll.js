const Friends = require ('./../models/friends');
const Users = require ('./../models/users');
const SocketIO = require('socket.io');
const { emit } = require('./../models/users');


/**
 *
 * @param {SocketIO.Server} io
 */
module.exports = async (name, id, data, io, emitToSelf = true) => {

  const friends = await Friends.find({requester: id}).populate('recipient');
  const user = await Users.findById(id).populate('servers');


  let roomIDArr = [];





  for (let index = 0; index < user.servers.length; index++) {
    const server = user.servers[index];
    roomIDArr.push("server:" + server.server_id);
  }

  for (let index = 0; index < friends.length; index++) {
    const friend = friends[index];
    if (!friend.recipient?.length) continue;
    roomIDArr.push(friend.recipient.uniqueID);
  }


  
  if (emitToSelf) {
    roomIDArr.push(user.uniqueID);
  } else {
    // remove existing 
    io.in(user.uniqueID).clients((err, clients) => {
      roomIDArr = roomIDArr.filter(id => !clients.includes(id))
      emitTo(name, data, roomIDArr, io)
    })
  }
}
function emitTo(name, data, roomIDArr, io) {
  io.of('/').adapter.clients(roomIDArr, (err, clients) => {
    console.log(clients);
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.to(id).emit(name, data)
    }
  })
}