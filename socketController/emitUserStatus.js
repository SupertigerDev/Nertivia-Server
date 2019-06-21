const Friends = require ('./../models/friends');
const Users = require ('./../models/users');
const redis = require ('../redis');
module.exports = async (uniqueID, id, status, io, modifyDB) => {

  if (modifyDB) {
    await Users.updateOne({_id: id}, 
    {$set: {"status": status}})
  }

  const friends = await Friends.find({requester: id}).populate('recipient');
  const user = await Users.findById(id).populate('servers');

  for (let server of user.servers) {
    server.server_id
  }

  for (let friend of friends) {
    if (friend.recipient)
    io.in(friend.recipient.uniqueID).emit('userStatusChange', {
      uniqueID: uniqueID,
      status
    });
  }
  // send owns status to every connected device 
  io.in(uniqueID).emit('multiDeviceStatus', {status});
    

}