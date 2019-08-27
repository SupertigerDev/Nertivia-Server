const events = require("./socketEvents/index");
const controller = require("./socketController");
const jwtAuth = require("socketio-jwt-auth");
const User = require("./models/users");
const ServerMembers = require("./models/ServerMembers");
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

/**
 *
 * @param {sio.Socket} client
 */
module.exports = async client => {
  client.on("authentication", async data => {
    const { token } = data;

    try {
      const decryptedToken = await jwt.verify(token, config.jwtSecret);

      // get the user
      const populateFriends = {
        path: "friends",
        populate: [
          {
            path: "recipient",
            select: "username uniqueID tag admin -_id"
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
        select: "name creator default_channel_id server_id avatar"
      };
      const userSelect = "avatar username email uniqueID tag settings servers survey_completed GDriveRefreshToken"

      const user = await User.findOne({ uniqueID: decryptedToken.sub })
        .select(userSelect)
        .populate(populateFriends)
        .populate(populateServers)
        .lean();



      // disconnect user if not found.
      if (!user) {
        client.emit("auth_err", "Invalid Token");
        client.disconnect(true);
        return;
      }

      let serverMembers = [];

      if (user.servers) {
        // Map serverIDs
        const serverIDs = user.servers.map(a => a._id);


        let serverChannels = await channels
          .find({ server: { $in: serverIDs } })
          .select("name channelID server")
          .lean();

        user.servers = user.servers.map(server => {
          const filteredChannels = serverChannels.filter(channel =>
            channel.server.equals(server._id)
          );
          server.channels = filteredChannels;
          return server;
        });

        serverMembers = await ServerMembers.find({ server: { $in: serverIDs } })
          .populate("member")
          .lean();

        //console.log(serverChannels)

        serverMembers = serverMembers.map(sm => {
          const server = user.servers.find(
            s => s._id.toString() == sm.server.toString()
          );

          delete sm.server;
          delete sm._id;
          delete sm.__v;
          sm.member = {
            username: sm.member.username,
            tag: sm.member.tag,
            avatar: sm.member.avatar,
            uniqueID: sm.member.uniqueID
          };
          sm.server_id = server.server_id;
          return sm;
        });
      }

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

      let resObj = {};

      const customEmojisList = customEmojis.find({ user: user._id });
      resObj.result = await Promise.all([dms, notifications, customEmojisList]);
      resObj.dms = resObj.result[0];
      resObj.notifications = resObj.result[1];
      resObj.settings = {
        ...user.settings,
        GDriveLinked: user.GDriveRefreshToken ? true : false,
        customEmojis: resObj.result[2]
      };
      resObj.result = null;
      delete resObj.result;
      resObj._id = user._id;
      resObj.user = user;
      resObj.serverMembers = serverMembers;

      user.GDriveRefreshToken = undefined;
      client.join(user.uniqueID);

      if (user.servers && user.servers.length) {
        for (let index = 0; index < user.servers.length; index++) {
          const element = user.servers[index];
          client.join("server:" + element.server_id);
        }
      }

      let friendUniqueIDs = resObj.user.friends.map(m => {
        if (m.recipient) return m.recipient.uniqueID;
      });

      let serverMemberUniqueIDs = resObj.serverMembers.map(
        m => m.member.uniqueID
      );

      let { ok, error, result } = await redis.getPresences([
        ...friendUniqueIDs,
        ...serverMemberUniqueIDs
      ]);

      client.emit("success", {
        message: "Logged in!",
        user: resObj.user,
        serverMembers: resObj.serverMembers,
        settings: resObj.settings,
        dms: resObj.dms,
        notifications: resObj.notifications,
        currentFriendStatus: result
      });
      resObj = null;
      delete resObj;

      result = null;
      delete result;

      friendUniqueIDs = null;
      delete friendUniqueIDs;

      serverMemberUniqueIDs = null;
      delete serverMemberUniqueIDs;
    } catch (e) {
      console.log(e);
      client.emit("auth_err", "Invalid Token");
      client.disconnect(true);
    }
  });

  client.on("disconnect", async () => {});

  client.on("notification:dismiss", data =>
    events.notificationDismiss(data, client, io)
  );
};
