const events = require("./socketEvents/index");
const controller = require("./socketController");
const jwtAuth = require("socketio-jwt-auth");
const User = require("./models/users");
const channels = require("./models/channels");
const config = require("./config");
const Notifications = require("./models/notifications");
const customEmojis = require("./models/customEmojis");
const { newUser } = require("./passport");
const jwt = require("jsonwebtoken");
const { io } = require("./app");
const redis = require("./redis");

// Authendicate token
io.use(async (socket, next) => {
  const token = socket.handshake.headers["authorization"];
  if (!token || token === "null")
    return next(new Error("Authentication error"));

  try {
    const decryptedToken = await jwt.verify(token, config.jwtSecret);
    const user = await User.findOne({ uniqueID: decryptedToken.sub })
      .select("+GDriveRefreshToken +settings +servers +survey_completed")
      .populate(
        {
          path: "friends",
          populate: [
            {
              path: "recipient",
              select: "-_id -id -password -__v -email -friends -status"
            }
          ],
          select: "-requester -__v"
        }
      ).populate({path: "servers", populate: [{path: "creator", select: "-servers -friends -_id -__v -avatar -status -created -admin -username -tag"}], select: "-__v"})
      .lean();
    if (!user) {
      next(new Error("Authentication error"));
      return;
    }

    //TODO check if accounts with no servers will crash the server.
    const serverIDs = user.servers.map(a => a._id);

    // find channels for servers.
    let serverChannels = await channels.find({server: {$in: serverIDs}}).lean();


    user.servers = user.servers.map(server => {
      const filteredChannels = serverChannels.filter(channel => channel.server.equals(server._id));
      server.channels = filteredChannels;
      return server
    })

    console.log(user.servers)


    // serverChannels = serverChannels.map(channel => {
    //   const server = user.servers.find(server => channel.server.equals(server._id));
    //   channel.server = undefined;
    //   channel.server_id = server.server_id
    //   return channel;
    // })

    
    const dms = channels
      .find({ creator: user._id })
      .populate({
        path: "recipients",
        select:
          "-_id -id -password -__v -email -friends -status -created -lastSeen"
      })
      .lean();

    const notifications = Notifications.find({ recipient: user.uniqueID })
      .populate({
        path: "sender",
        select:
          "-_id -id -password -__v -email -friends -status -created -lastSeen"
      })
      .lean();

    const customEmojisList = customEmojis.find({ user: user._id });
    const result = await Promise.all([dms, notifications, customEmojisList]);
    socket.request.dms = result[0];
    socket.request.notifications = result[1];
    socket.request._id = user._id;
    socket.request.user = user;
    socket.request.settings = {
      ...user.settings,
      GDriveLinked: user.GDriveRefreshToken ? true : false,
      customEmojis: result[2]
    };
    socket.request.user.GDriveRefreshToken = undefined;
    socket.join(user.uniqueID);

    if (socket.request.user.servers && socket.request.user.servers.length) {
      for (let index = 0; index <  socket.request.user.servers.length; index++) {
        const element =  socket.request.user.servers[index];
        socket.join('server:' + element.server_id)
        
      }
    }


    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});
module.exports = async client => {
  // set client status to redis and emit user status to friends.
  await redis.connected(
    client.request.user.uniqueID,
    client.request._id.toString(),
    client.request.user.status,
    client.id
  );
  controller.emitUserStatus(
    client.request.user.uniqueID,
    client.request._id,
    client.request.user.status,
    io
  );

  // get list of current online friends.
  const { ok, error, result } = await redis.checkFriendsOnline(
    client.request.user.friends
  );
  if (ok) {
    client.emit("success", {
      message: "Logged in!",
      user: client.request.user,
      settings: client.request.settings,
      dms: client.request.dms,
      notifications: client.request.notifications,
      currentFriendStatus: result
    });
  }

  client.on("disconnect", async () => {
    const response = await redis.disconnected(
      client.request.user.uniqueID,
      client.id
    );
    if (response.result === 1) {
      // if all clients are offline
      controller.emitUserStatus(
        client.request.user.uniqueID,
        client.request._id,
        0,
        io
      );
    }
  });

  client.on("notification:dismiss", data =>
    events.notificationDismiss(data, client, io)
  );
};
