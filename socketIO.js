const events = require("./socketEvents/index");
const controller = require("./socketController");
const jwtAuth = require("socketio-jwt-auth");
const User = require("./models/users");
const ServerMembers = require("./models/ServerMembers");
const ServerRoles = require("./models/Roles");
const channels = require("./models/channels");
const config = require("./config");
const Notifications = require("./models/notifications");
const customEmojis = require("./models/customEmojis");
const { newUser } = require("./passport");
const jwt = require("jsonwebtoken");
const { io } = require("./app");
const redis = require("./redis");
const sio = require("socket.io");
const mongoose = require("mongoose");

// nsps = namespaces.
// disable socket events when not authorized .
for (let key in io.nsps) {
  const nsp = io.nsps[key];
  nsp.on("connect", function(socket) {
    if (!socket.auth) {
      delete nsp.connected[socket.id];
    }
  });
}

const populateFriends = {
  path: "friends",
  populate: [
    {
      path: "recipient",
      select: "username uniqueID tag admin -_id avatar"
    }
  ],
  select: "recipient status -_id"
};

const populateServers = {
  path: "servers",
  populate: [
    {
      path: "creator",
      select: "uniqueID -_id"
      //select: "-servers -friends -_id -__v -avatar -status -created -admin -username -tag"
    }
  ],
  select: "name creator default_channel_id server_id avatar banner channel_position"
};

/**
 *
 * @param {sio.Socket} client
 */
module.exports = async client => {
  client.on("authentication", async data => {
    const { token } = data;

    try {
      const decryptedToken = await jwt.verify(token, config.jwtSecret);
      client.auth = true;

      // get the user

      const userSelect =
        "avatar username admin email uniqueID tag settings servers survey_completed GDriveRefreshToken status";

      const user = await User.findOne({ uniqueID: decryptedToken.sub })
        .select(userSelect)
        .populate(populateFriends)
        .populate(populateServers)
        .lean();

      // disconnect user if not found.
      if (!user) {
        delete client.auth;
        client.emit("auth_err", "Invalid Token");
        client.disconnect(true);
        return;
      }

      await redis.connected(user.uniqueID, user._id, user.status, client.id);

      let serverMembers = [];

      let serverRoles = [];

      if (user.servers) {
        // Map serverIDs
        const serverIDs = user.servers.map(a => a._id);

        const serverChannels = await channels
          .find({ server: { $in: serverIDs } })
          .select("name channelID server server_id")
          .lean();

        user.servers = user.servers.map(server => {
          const filteredChannels = serverChannels.filter(channel =>
            channel.server.equals(server._id)
          );
          server.channels = filteredChannels;
          return server;
        });

        // Get server members TODO: add server_id to all serverMembers in the database.
        serverMembers = await ServerMembers.find(
          { server: { $in: serverIDs } },
          { _id: 0 }
        )
          .select("type member server_id roles")
          .populate({
            path: "member",
            select: "username tag avatar uniqueID member -_id"
          })
          .lean();

        // get roles from all servers
        serverRoles = await ServerRoles.find(
          {server: {$in : serverIDs}},
          {_id: 0}
        ).select("name id color permissions server_id deletable")
      }

      const dms = channels
        .find({ creator: user._id }, { _id: 0 })
        .select("recipients channelID lastMessaged")
        .populate({
          path: "recipients",
          select: "avatar username uniqueID tag -_id"
        })
        .lean();

      const notifications = Notifications.find({ recipient: user.uniqueID })
        .select("type sender lastMessageID count recipient channelID -_id")
        .populate({
          path: "sender",
          select: "avatar username uniqueID tag -_id"
        })
        .lean();

      const customEmojisList = customEmojis.find({ user: user._id });
      results = await Promise.all([dms, notifications, customEmojisList]);

      client.join(user.uniqueID);

      if (user.servers && user.servers.length) {
        for (let index = 0; index < user.servers.length; index++) {
          const element = user.servers[index];
          client.join("server:" + element.server_id);
        }
      }

      let friendUniqueIDs = user.friends.map(m => {
        if (m.recipient) return m.recipient.uniqueID;
      });

      let serverMemberUniqueIDs = serverMembers.map(m => m.member.uniqueID);

      let { ok, error, result } = await redis.getPresences([
        ...friendUniqueIDs,
        ...serverMemberUniqueIDs
      ]);

      const settings = {
        ...user.settings,
        GDriveLinked: user.GDriveRefreshToken ? true : false,
        customEmojis: results[2]
      };
      user.GDriveRefreshToken = undefined;

      // check if user is already online on other clients
      const checkAlready = await redis.connectedUserCount(user.uniqueID);
      // if multiple users are still online
      if (checkAlready && checkAlready.result === 1) {
        controller.emitUserStatus(user.uniqueID, user._id, user.status, io);
      }

      // nsps = namespaces.
      // enabled socket events when authorized.
      for (let key in io.nsps) {
        const nsp = io.nsps[key];
        for (_key in nsp.sockets) {
          if (_key === client.id) {
            nsp.connected[client.id] = client;
          }
        }
      }

      client.emit("success", {
        message: "Logged in!",
        user,
        serverMembers,
        serverRoles: serverRoles,
        dms: results[0],
        notifications: results[1],
        currentFriendStatus: result,
        settings
      });
    } catch (e) {
      console.log(e);
      delete client.auth;
      client.emit("auth_err", "Invalid Token");
      client.disconnect(true);
    }
  });

  //If the socket didn't authenticate, disconnect it
  setTimeout(function() {
    if (!client.auth) {
      client.emit("auth_err", "Invalid Token");
      client.disconnect(true);
    }
  }, 10000);

  client.on("disconnect", async () => {
    if (!client.auth) return;
    const { ok, result, error } = await redis.getConnectedBySocketID(client.id);
    if (!ok) return;

    const response = await redis.disconnected(result.u_id, client.id);

    // if all users have gone offline, emit offline status to friends.
    if (response.result === 1) {
      controller.emitUserStatus(result.u_id, result._id, 0, io);
    }
  });

  client.on("notification:dismiss", data =>
    events.notificationDismiss(data, client, io)
  );
};
