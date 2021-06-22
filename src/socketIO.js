const events = require("./socketEvents/index");
const emitUserStatus = require("./socketController/emitUserStatus");
const emitToAll = require("./socketController/emitToAll");
const User = require("./models/users");
const ServerMembers = require("./models/ServerMembers");
const ServerRoles = require("./models/Roles");
const channels = require("./models/channels");
import blockedUsers from "./models/blockedUsers";
const Notifications = require("./models/notifications");
const BannedIPs = require("./models/BannedIPs");
const customEmojis = require("./models/customEmojis");
const jwt = require("jsonwebtoken");
// const { getIOInstance() } = require("./app");
const redis = require("./redis");
// const sio = require("socket.getIOInstance()");

import { getIOInstance } from "./socket/instance";
import getUsrDetails from './utils/getUserDetails';

// nsps = namespaces.
// disable socket events when not authorized .
disableEvents()

const populateFriends = {
  path: "friends",
  populate: [
    {
      path: "recipient",
      select: "username id tag admin -_id avatar"
    }
  ],
  select: "recipient status -_id"
};

const populateServers = {
  path: "servers",
  populate: [
    {
      path: "creator",
      select: "id -_id"
    }
  ],
  select:
    "name creator default_channel_id server_id avatar banner channel_position verified"
};

/**
 * @param {sio.Socket} client
 */
module.exports = async client => {

  //If the socket didn't authenticate(), disconnect it
  let timeout = setTimeout(function () {
    if (!client.auth) {
      client.emit("auth_err", "Token Timeout!");
      client.disconnect(true);
    }
  }, 10000);


  client.on("authentication", async data => {
    const { token } = data;

    let decryptedToken = await asyncVerifyJWT(token)
      .catch(e => {
        client.emit("auth_err", "Invalid Token");
      })
    if (!decryptedToken) return;

    try {
      client.auth = true;
      clearTimeout(timeout);

      // get the user

      const userSelect =
        "avatar banner username type badges email id tag settings servers survey_completed GDriveRefreshToken status custom_status email_confirm_code banned bot passwordVersion readTerms";

      const user = await User.findOne({ id: decryptedToken.userID })
        .select(userSelect)
        .populate(populateFriends)
        .populate(populateServers)
        .lean();

      // disconnect user if not found.
      if (!user) {
        console.log("Disconnect Reason: User not found in db");
        delete client.auth;
        client.emit("auth_err", "Invalid Token");
        client.disconnect(true);
        return;
      }

      if (user.banned) {
        console.log("Disconnect Reason: User is banned", user.username, user.id);
        delete client.auth;
        client.emit("auth_err", "You are banned.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      if (user.email_confirm_code) {
        console.log("Disconnect Reason Email not confirmed");
        delete client.auth;
        client.emit("auth_err", "Email not confirmed");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }


      const pswdVerNotEmpty = user.passwordVersion === undefined && decryptedToken.passwordVersion !== 0;
      if (pswdVerNotEmpty || user.passwordVersion !== undefined && user.passwordVersion !== decryptedToken.passwordVersion) {
        console.log("loggedOutReason: Invalid Password Version");
        delete client.auth;
        client.emit("auth_err", "Token invalidated.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }


      const ip = client.handshake.address;
      const ipBanned = await BannedIPs.exists({ ip: ip });

      if (ipBanned) {
        console.log("loggedOutReason: IP is banned.", user.username, user.id);
        delete client.auth;
        client.emit("auth_err", "IP is Banned.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      if (!user.bot && !user.readTerms) {
        //console.log("Disconnect Reason: Terms not accepted", user.username, user.id);
        delete client.auth;
        client.emit("auth_err", "terms_not_agreed");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      delete user.readTerms;

      await redis.connected(user.id, user._id, user.status, user.custom_status, client.id);

      let serverMembers = [];

      let serverRoles = [];

      if (user.servers) {
        // Map serverIDs
        const serverIDs = user.servers.map(a => a._id);

        const serverChannels = await channels
          .find({ server: { $in: serverIDs } })
          .select("name channelID server server_id lastMessaged rateLimit icon")
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
            select: "username tag avatar id member -_id bot botPrefix"
          })
          .lean();

        // get roles from all servers
        serverRoles = await ServerRoles.find(
          { server: { $in: serverIDs } },
          { _id: 0 }
        ).select("name id color permissions server_id deletable order default bot hideRole");
      }

      const dms = channels
        .find({ creator: user._id, hide: { $ne: true } }, { _id: 0 })
        .select("recipients channelID lastMessaged")
        .populate({
          path: "recipients",
          select: "avatar username id tag bot -_id"
        })
        .lean();

      const notifications = Notifications.find({ recipient: user.id })
        .select(
          "mentioned type sender lastMessageID count recipient channelID -_id"
        )
        .populate({
          path: "sender",
          select: "avatar username id tag -_id"
        })
        .lean();

      const mutedChannelsAndServers = ServerMembers.find(
        {
          member: user._id,
          $or: [
            { muted_channels: { $exists: true, $not: { $size: 0 } } },
            { muted: { $exists: true, $ne: 0 } }
          ]
        },
        { _id: 0 }
      ).select("muted_channels muted server_id");

      const lastSeenServerChannels = (await ServerMembers.find({
        member: user._id,
        last_seen_channels: { $exists: true, $not: { $size: 0 } }
      }, { _id: 0 }).select("last_seen_channels").lean()).map(res => res.last_seen_channels).reduce((accumulator, currentValue) => {
        return { ...accumulator, ...currentValue }
      }, {})


      const customEmojisList = customEmojis.find({ user: user._id }, { _id: 0 }).select("emojiID gif name");

      const bannedUserIDs = (await blockedUsers.find({ requester: user._id }).populate("recipient", "id")).map(d => d.recipient.id)

      const results = await Promise.all([
        dms,
        notifications,
        customEmojisList,
        mutedChannelsAndServers
      ]);

      client.join(user.id);

      if (user.servers && user.servers.length) {
        for (let index = 0; index < user.servers.length; index++) {
          const element = user.servers[index];
          client.join("server:" + element.server_id);
        }
      }

      let friendUniqueIDs = user.friends.map(m => {
        if (m.recipient) return m.recipient.id;
      });

      let serverMemberUniqueIDs = serverMembers.map(m => m.member.id);

      const arr = [
        ...friendUniqueIDs,
        ...serverMemberUniqueIDs
      ]

      const { customStatusArr, memberStatusArr, programActivityArr } = await getUsrDetails(arr.filter((u, i) => arr.indexOf(u) === i))


      const settings = {
        ...user.settings,
        GDriveLinked: user.GDriveRefreshToken ? true : false,
        customEmojis: results[2]
      };
      user.GDriveRefreshToken = undefined;

      // check if user is already online on other clients
      const checkAlready = await redis.connectedUserCount(user.id);
      // only emit if there are no other users online (1 because we just connected)
      if (checkAlready && checkAlready.result === 1) {
        emitUserStatus(user.id, user._id, user.status, getIOInstance(), false, user.custom_status, true)
      }

      // nsps = namespaces.
      // enabled socket events when authorized. (dont think it works on socketio 4.0)
      for (const key in getIOInstance().nsps) {
        const nsp = getIOInstance().nsps[key];
        for (const _key in nsp.sockets) {
          if (_key === client.id) {
            nsp.connected[client.id] = client;
          }
        }
      }

      let concatedMutedChannels = [];
      for (let i = 0; i < results[3].length; i++) {
        const res = results[3][i].muted_channels;
        if (res && res.length) {
          concatedMutedChannels = [...concatedMutedChannels, ...res]
        }
      }
      let mutedServers = [];
      for (let i = 0; i < results[3].length; i++) {
        const res = results[3][i];
        if (res.muted) {
          mutedServers.push({ muted: res.muted, server_id: res.server_id });
        }
      }

      clearTimeout(timeout);
      client.emit("success", {
        message: "Logged in!",
        user,
        serverMembers,
        serverRoles: serverRoles,
        dms: results[0],
        mutedChannels: concatedMutedChannels,
        mutedServers: mutedServers,
        notifications: results[1],
        memberStatusArr,
        customStatusArr,
        programActivityArr,
        settings,
        lastSeenServerChannels,
        bannedUserIDs,
        pid: process.pid

      });
    } catch (e) {
      delete client.auth;
      client.emit("auth_err", "Invalid Token");
      console.log("Error when connecting:")
      console.log(e)
      client.disconnect(true);
      clearTimeout(timeout);
    }
  });



  client.on("disconnect", async () => {
    if (!client.auth) return;
    const { ok, result, error } = await redis.getConnectedBySocketID(client.id);
    if (!ok || !result) return;
    const presence = await redis.getPresence(result.id);

    const response = await redis.disconnected(result.id, client.id);

    // if all users have gone offline, emit offline status to friends.
    if (response.result === 1 && presence?.result?.[1] !== '0') {
      emitUserStatus(result.id, result._id, 0, getIOInstance());
    } else {
      // remove program activity status if the socket id matches
      const programActivity = await redis.getProgramActivity(result.id);
      if (!programActivity.ok || !programActivity.result) return;
      const { socketID } = JSON.parse(programActivity.result);
      if (socketID === client.id) {
        await redis.setProgramActivity(result.id, null);
        emitToAll("programActivity:changed", result._id, { user_id: result.id }, getIOInstance())
      }

    }
  });

  client.on("notification:dismiss", data =>
    events.notificationDismiss(data, client, getIOInstance())
  );

  client.on("programActivity:set", async data => {
    const { ok, result } = await redis.getConnectedBySocketID(client.id);
    if (!ok || !result) return;
    const userID = result.id
    const _id = result._id;
    if (data) {
      if (data.name) {
        data.name = data.name.substring(0, 100)
      }
      if (data.status) {
        data.status = data.status.substring(0, 100)
      }
      const res = await redis.setProgramActivity(userID, { name: data.name, status: data.status, socketID: client.id })
      const json = JSON.parse(res.result[0])
      // only emit if: 
      // json is empty
      // json is not the same.
      if ((json && (json.name !== data.name || json.status !== data.status)) || (!json)) {
        emitToAll("programActivity:changed", _id, { name: data.name, status: data.status, user_id: userID }, getIOInstance())
      }
    } else {
      await redis.setProgramActivity(userID, null);
      emitToAll("programActivity:changed", _id, { user_id: userID }, getIOInstance())
    }
  })
};

//(dont think it works on socketio 4.0)
function disableEvents() {
  const nsps = getIOInstance().nsps;
  for (let key in nsps) {
    const nsp = nsps[key];
    nsp.on("connect", function (socket) {
      if (!socket.auth) {
        delete nsp.connected[socket.id];
      }
    });
  }
}


function asyncVerifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(process.env.JWT_HEADER + token, process.env.JWT_SECRET, (err, value) => {
      if (err) { reject(err); return; }
      const [userID, passwordVersion] = value.split("-");
      const payload = {
        userID,
        passwordVersion: parseInt(passwordVersion || "0")
      }
      resolve(payload)
    })
  })
}