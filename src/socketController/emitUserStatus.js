const Friends = require ('./../models/friends');
const Users = require ('./../models/users');
const emitToAll = require("./emitToAll");
module.exports = async (uniqueID, id, status, io, modifyDB) => {

  if (modifyDB) {
    await Users.updateOne({_id: id}, 
    {$set: {"status": status}})
  }


  emitToAll("userStatusChange", id, {uniqueID, status}, io);

  // send owns status to every connected device 
  io.in(uniqueID).emit('multiDeviceStatus', {status});
    

}