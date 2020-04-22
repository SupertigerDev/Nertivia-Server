const Friends = require ('./../models/friends');
const Users = require ('./../models/users');
const SocketIO = require('socket.io')


/**
 *
 * @param {SocketIO.Server} io
 */
module.exports = async (name, id, data, io, emitToSelf = true) => {

  const friends = await Friends.find({requester: id}).populate('recipient');
  const user = await Users.findById(id).populate('servers');


  let sockets = {};


  for (let index = 0; index < user.servers.length; index++) {
    const server = user.servers[index];
    const room = io.sockets.adapter.rooms["server:" + server.server_id];
    if (!room || !room.sockets) continue;
    sockets = {...sockets, ...room.sockets}
  }

  for (let index = 0; index < friends.length; index++) {
    const friend = friends[index];
    if (!friend.recipient) continue;
    const room = io.sockets.adapter.rooms[friend.recipient.uniqueID];
    if (!room || !room.sockets) continue;
    sockets = {...sockets, ...room.sockets}
  }

  const room = io.sockets.adapter.rooms[user.uniqueID]
  if (room && room.sockets) {
    if (emitToSelf) {
      sockets = {...sockets, ...room.sockets}
   } else {
     const socketIDArr = Object.keys(room.sockets);
     for (let index = 0; index < socketIDArr.length; index++) {
       const socketID = socketIDArr[index];
       delete sockets[socketID]
     }
   }
  }


  const idArr = Object.keys(sockets);
  for (let index = 0; index < idArr.length; index++) {
    const id = idArr[index];
    io.to(id).emit(name, data)
  }

}