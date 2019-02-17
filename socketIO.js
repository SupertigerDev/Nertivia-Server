const events = require('./socketEvents');
const controller = require('./socketController');
const jwtAuth = require('socketio-jwt-auth');
const User = require('./models/users');
const channels = require('./models/channels');
const Notifications = require('./models/notifications');
const config = require('./config');
const {newUser} = require('./passport');
const jwt = require('jsonwebtoken');
const {io} = require('./app');
const redis = require('./redis');




// Authendicate token
io.use(async (socket, next) => {
  const token = socket.handshake.headers['authorization']
  if (!token || token === "null") return next(new Error('Authentication error'));
  
  try {
    const decryptedToken = await jwt.verify(token, config.jwtSecret)
    const user = await User.findOne({uniqueID: decryptedToken.sub}).populate({
      path: 'friends',
      populate: [{
        path: 'recipient',
        select: '-_id -id -password -__v -email -friends -status',
      }],
      select: '-requester -__v'
    }).lean();
    if (!user) {
      next(new Error('Authentication error'))
      return;
    }
    const dms = channels.find({creator: user._id}).populate({
      path: 'recipients',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    }).lean();

    const notifications = Notifications.find({recipient: user.uniqueID}).populate({
      path: 'sender',
      select: '-_id -id -password -__v -email -friends -status -created -lastSeen'
    }).lean();

    const result = await Promise.all([dms, notifications]);
    socket.request.dms = result[0]
    socket.request.notifications = result[1];
    socket.request._id = user._id
    socket.request.user = newUser(user);
    socket.request.user.friends = user.friends
    socket.join(user.uniqueID);
    next();
  } catch (error) {
    next(new Error('Authentication error'))
  }

})
module.exports = async (client) => {

  // set client status to redis and emit user status to friends.
  await redis.connected(client.request.user.uniqueID, client.request._id.toString(), client.request.user.status, client.id);
  controller.emitUserStatus(client.request.user.uniqueID, client.request._id, client.request.user.status, io);

  // get list of current online friends.
  const {ok, error, result} = await redis.checkFriendsOnline(client.request.user.friends);
  if (ok) {
    client.emit('success', {
      message: "Logged in!",
      user: client.request.user,
      dms: client.request.dms,
      notifications: client.request.notifications,
      currentFriendStatus: result
    })
  }

  client.on('disconnect', async () => {
    const response = await redis.disconnected(client.request.user.uniqueID, client.id)
    if (response.result === 1){
      // if all clients are offline
      controller.emitUserStatus(client.request.user.uniqueID, client.request._id, 0, io);
    }
  })
}