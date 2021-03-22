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
for (let key in getIOInstance().nsps) {
  const nsp = getIOInstance().nsps[key];
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
  select:
    "name creator default_channel_id server_id avatar banner channel_position verified"
};

/**
 *
 * @param {sio.Socket} client
 */
module.exports = async client => {
  //If the socket didn't authenticate(), disconnect it
  let timeout = setTimeout(function() {
    if (!client.auth) {
      client.emit("auth_err", "Invalid Token");
      client.disconnect(true);
    }
  }, 10000);


  client.on("authentication", async data => {
    const { token } = data;

    try {
      let decryptedToken = await jwt.verify(
        process.env.JWT_HEADER + token,
        process.env.JWT_SECRET
      );
      const split = decryptedToken.split("-");
      decryptedToken = split[0];
      const passwordVersion = split[1] ? parseInt(split[1]) : 0;
      client.auth = true;

      // get the user

      const userSelect =
        "avatar username admin email uniqueID tag settings servers survey_completed GDriveRefreshToken status custom_status email_confirm_code banned bot passwordVersion readTerms";

      const user = await User.findOne({ uniqueID: decryptedToken })
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
        clearTimeout(timeout);
        return;
      }

      if (user.banned) {
        console.log("Disconnect Reason: User is banned", user.username, user.uniqueID);
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


      const pswdVerNotEmpty = user.passwordVersion === undefined && passwordVersion !== 0;
      if (pswdVerNotEmpty || user.passwordVersion !== undefined && user.passwordVersion !== passwordVersion) {
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
        console.log("loggedOutReason: IP is banned.", user.username, user.uniqueID);
        delete client.auth;
        client.emit("auth_err", "IP is Banned.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      if (!user.bot && !user.readTerms) {
        //console.log("Disconnect Reason: Terms not accepted", user.username, user.uniqueID);
        delete client.auth;
        client.emit("auth_err", "terms_not_agreed");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      delete user.readTerms;

      await redis.connected(user.uniqueID, user._id, user.status, user.custom_status, client.id);

      let serverMembers = [];

      let serverRoles = [];

      if (user.servers) {
        // Map serverIDs
        const serverIDs = user.servers.map(a => a._id);

        const serverChannels = await channels
          .find({ server: { $in: serverIDs } })
          .select("name channelID server server_id lastMessaged")
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
            select: "username tag avatar uniqueID member -_id bot botPrefix"
          })
          .lean();

        // get roles from all servers
        serverRoles = await ServerRoles.find(
          { server: { $in: serverIDs } },
          { _id: 0 }
        ).select("name id color permissions server_id deletable order default bot hideRole");
      }

      const dms = channels
        .find({ creator: user._id, hide: {$ne: true} }, { _id: 0 })
        .select("recipients channelID lastMessaged")
        .populate({
          path: "recipients",
          select: "avatar username uniqueID tag bot -_id"
        })
        .lean();

      const notifications = Notifications.find({ recipient: user.uniqueID })
        .select(
          "mentioned type sender lastMessageID count recipient channelID -_id"
        )
        .populate({
          path: "sender",
          select: "avatar username uniqueID tag -_id"
        })
        .lean();

      const mutedChannelsAndServers = ServerMembers.find(
        {
          member: user._id,
          $or: [
            {muted_channels: { $exists: true, $not: { $size: 0 }}},
            {muted: { $exists: true, $ne: 0 }}
          ]
        },
        { _id: 0 }
      ).select("muted_channels muted server_id");

      const lastSeenServerChannels = (await ServerMembers.find({
        member: user._id,
        last_seen_channels: {$exists: true, $not: {$size: 0}}
      }, {_id: 0}).select("last_seen_channels").lean()).map(res => res.last_seen_channels).reduce((accumulator, currentValue) => {
        return {...accumulator, ...currentValue}
      }, {})


      const customEmojisList = customEmojis.find({ user: user._id }, {_id: 0}).select("emojiID gif name");

      const bannedUserIDs = (await blockedUsers.find({requester: user._id}).populate("recipient", "uniqueID")).map(d => d.recipient.uniqueID)

      const results = await Promise.all([
        dms,
        notifications,
        customEmojisList,
        mutedChannelsAndServers
      ]);

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

      const arr = [
        ...friendUniqueIDs,
        ...serverMemberUniqueIDs
      ]

      const {customStatusArr, memberStatusArr, programActivityArr} = await getUsrDetails(arr.filter((u, i) => arr.indexOf(u) === i))


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
        emitUserStatus(
          user.uniqueID,
          user._id,
          user.status,
          getIOInstance()
        );
      }

      // nsps = namespaces.
      // enabled socket events when authorized.
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
        if (res && res.length){
          concatedMutedChannels = [...concatedMutedChannels, ...res]
        }
      }
      let mutedServers = [];
      for (let i = 0; i < results[3].length; i++) {
        const res = results[3][i];
        if (res.muted) {
          mutedServers.push({muted: res.muted, server_id: res.server_id});
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
        mutedServers:  mutedServers,
        notifications: results[1],
        memberStatusArr,
        customStatusArr,
        programActivityArr,
        settings,
        lastSeenServerChannels,
        bannedUserIDs
        
      });
    } catch (e) {
      delete client.auth;
      client.emit("auth_err", "Invalid Token");
      client.disconnect(true);
      clearTimeout(timeout);
    }
  });



  client.on("disconnect", async () => {
    if (!client.auth) return;
    const { ok, result, error } = await redis.getConnectedBySocketID(client.id);
    if (!ok || !result) return;

    const response = await redis.disconnected(result.u_id, client.id);

    // if all users have gone offline, emit offline status to friends.
    if (response.result === 1) {
      emitUserStatus(result.u_id, result._id, 0, getIOInstance());
    } else {
      // remove program activity status if the socket id matches
      const programActivity = await redis.getProgramActivity(result.u_id);
      if (!programActivity.ok || !programActivity.result) return;
      const {socketID} = JSON.parse(programActivity.result);
      if (socketID === client.id) {
        await redis.setProgramActivity(result.u_id, null);
        emitToAll("programActivity:changed", result._id, {uniqueID: result.u_id}, getIOInstance())
      }

    }
  });

  client.on("notification:dismiss", data =>
    events.notificationDismiss(data, client, getIOInstance())
  );

  client.on("programActivity:set", async data => {
    const { ok, result } = await redis.getConnectedBySocketID(client.id);
    if (!ok || !result) return;
    const uniqueID = result.u_id
    const _id = result._id;
    if (data) {
      if (data.name) {
        data.name = data.name.substring(0, 100)
      }
      if (data.status) {
        data.status = data.status.substring(0, 100)
      }
      const res = await redis.setProgramActivity(uniqueID, {name: data.name, status: data.status, socketID: client.id})
      const json = JSON.parse(res.result[0])
      // only emit if: 
      // json is empty
      // json is not the same.
      if ( (json && (json.name !== data.name || json.status !== data.status)) || (!json) ) {
        emitToAll("programActivity:changed", _id, {name: data.name, status: data.status, uniqueID}, getIOInstance())
      }
    } else {
      await redis.setProgramActivity(uniqueID, null);
      emitToAll("programActivity:changed", _id, {uniqueID}, getIOInstance())
    }
  })
};
