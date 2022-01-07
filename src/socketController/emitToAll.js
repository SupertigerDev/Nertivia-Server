import {Friends} from '../models/Friends';

import { Users } from '../models/Users';
const SocketIO = require('socket.io');



/**
 *
 * @param {SocketIO.Server} io
 */
module.exports = async (name, _id, data, io, emitToSelf = true) => {

  const friends = await Friends.find({requester: _id}).populate('recipient');
  const user = await Users.findById(_id).populate('servers');


  let roomIDArr = [];





  for (let index = 0; index < user.servers.length; index++) {
    const server = user.servers[index];
    roomIDArr.push("server:" + server.server_id);
  }

  for (let index = 0; index < friends.length; index++) {
    const friend = friends[index];
    if (!friend.recipient?.length) continue;
    roomIDArr.push(friend.recipient.id);
  }


  if (emitToSelf) {
    roomIDArr.push(user.id);
  } else {
    roomIDArr.filter(r => r !== user.id)
  }
  io.to(roomIDArr).emit(name, data)



}


