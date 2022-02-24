const events = require("./socketEvents/index");
const emitUserStatus = require("./socketController/emitUserStatus");
const emitToAll = require("./socketController/emitToAll");
import { Users } from "./models/Users";
import {ServerMembers} from "./models/ServerMembers";
import { ServerRoles } from "./models/ServerRoles";
import { Channels } from "./models/Channels";
import {BlockedUsers} from "./models/BlockedUsers";
import { addConnectedUser, getUserInVoiceByUserId, getVoiceUsersFromServerIds, getConnectedUserBySocketID, getConnectedUserCount, getPresenceByUserId, getProgramActivityByUserId, removeConnectedUser, removeConnectedUser, removeUserFromVoice, setProgramActivity, voiceUserExists, checkRateLimited } from "./newRedisWrapper";
import { Notifications } from "./models/Notifications";
import {BannedIPs} from "./models/BannedIPs";
import {CustomEmojis} from './models/CustomEmojis'
const jwt = require("jsonwebtoken");
// const { getIOInstance() } = require("./app");
const redis = require("./redis");
// const sio = require("socket.getIOInstance()");
import {Socket} from 'socket.io'

import { getIOInstance } from "./socket/instance";
import getUsrDetails from './utils/getUserDetails';
import { AUTHENTICATED, AUTHENTICATION_ERROR, USER_CALL_LEFT, USER_PROGRAM_ACTIVITY_CHANGED, VOICE_RETURN_SIGNAL_RECEIVED, VOICE_SIGNAL_RECEIVED } from "./ServerEventNames";

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
 * @param {Socket} client
 */
module.exports = async client => {

  //If the socket didn't authenticate(), disconnect it
  let timeout = setTimeout(function () {
    if (!client.auth) {
      client.emit(AUTHENTICATION_ERROR, "Token Timeout!");
      client.disconnect(true);
    }
  }, 10000);


  client.on("authentication", async data => {
    const { token } = data;
    

    const ip = (client.handshake.headers["cf-connecting-ip"] || client.handshake.headers["x-forwarded-for"] || client.handshake.address)?.toString();


    const ttl = await checkRateLimited({
      userIp: ip,
      expire: 120,
      name: "auth_event",
      requestsLimit: 20
    })
    if (ttl) {
      client.emit(AUTHENTICATION_ERROR, "Rate Limited!");
      client.disconnect(true);
      console.log("rate limited (auth_event)");
      return;
    }


    let decryptedToken = await asyncVerifyJWT(token)
      .catch(e => {
        client.emit(AUTHENTICATION_ERROR, "Invalid Token");
      })
    if (!decryptedToken) return;

    try {
      client.auth = true;
      clearTimeout(timeout);

      // get the user

      const userSelect =
        "avatar banner username type badges email id tag settings servers show_welcome GDriveRefreshToken status custom_status email_confirm_code banned bot passwordVersion readTerms";

      const user = await Users.findOne({ id: decryptedToken.userID })
        .select(userSelect)
        .populate(populateFriends)
        .populate(populateServers)
        .lean();

      // disconnect user if not found.
      if (!user) {
        console.log("Disconnect Reason: Users not found in db");
        delete client.auth;
        client.emit(AUTHENTICATION_ERROR, "Invalid Token");
        client.disconnect(true);
        return;
      }

      if (user.banned) {
        console.log("Disconnect Reason: Users is banned", user.username, user.id);
        delete client.auth;
        client.emit(AUTHENTICATION_ERROR, "You are banned.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      if (user.email_confirm_code) {
        console.log("Disconnect Reason Email not confirmed");
        delete client.auth;
        client.emit(AUTHENTICATION_ERROR, "Email not confirmed");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }


      const pswdVerNotEmpty = user.passwordVersion === undefined && decryptedToken.passwordVersion !== 0;
      if (pswdVerNotEmpty || user.passwordVersion !== undefined && user.passwordVersion !== decryptedToken.passwordVersion) {
        console.log("loggedOutReason: Invalid Password Version");
        delete client.auth;
        client.emit(AUTHENTICATION_ERROR, "Token invalidated.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }



      const ipBanned = await BannedIPs.exists({ ip: ip });

      if (ipBanned) {
        console.log("loggedOutReason: IP is banned.", user.username, user.id);
        delete client.auth;
        client.emit(AUTHENTICATION_ERROR, "IP is Banned.");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      if (!user.bot && !user.readTerms) {
        //console.log("Disconnect Reason: Terms not accepted", user.username, user.id);
        delete client.auth;
        client.emit(AUTHENTICATION_ERROR, "terms_not_agreed");
        client.disconnect(true);
        clearTimeout(timeout);
        return;
      }
      delete user.readTerms;

      await addConnectedUser(user.id, user._id, user.status, user.custom_status, client.id);

      let serverMembers = [];

      let callingChannelUserIds = {};
      let serverRoles = [];

      if (user.servers) {
        // Map serverObjectIds
        const serverObjectIds = user.servers.map(a => a._id);
        const serverIds = user.servers.map(s => s.server_id);


        [callingChannelUserIds] = await getVoiceUsersFromServerIds(serverIds)


        const serverChannels = await Channels
          .find({ server: { $in: serverObjectIds } })
          .select("name type channelId categoryId server server_id lastMessaged rateLimit icon")
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
          { server: { $in: serverObjectIds } },
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
          { server: { $in: serverObjectIds } },
          { _id: 0 }
        ).select("name id color permissions server_id deletable order default bot hideRole");
      }

      const dms = Channels
        .find({ creator: user._id, hide: { $ne: true } }, { _id: 0 })
        .select("recipients channelId lastMessaged")
        .populate({
          path: "recipients",
          select: "avatar username id tag bot -_id"
        })
        .lean();

      const notifications = Notifications.find({ recipient: user.id })
        .select(
          "mentioned type sender lastMessageID count recipient channelId -_id"
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


      const customEmojisList = CustomEmojis.find({ user: user._id }, { _id: 0 }).select("id gif name");

      const bannedUserIDs = (await BlockedUsers.find({ requester: user._id }).populate("recipient", "id")).map(d => d.recipient.id)

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
      const [connectedUserCount, error] = await getConnectedUserCount(user.id);

      // only emit if there are no other users online (1 because we just connected)
      if (connectedUserCount && connectedUserCount === 1) {
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
      client.emit(AUTHENTICATED, {
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
        callingChannelUserIds,
        pid: process.pid

      });
    } catch (e) {
      delete client.auth;
      client.emit(AUTHENTICATION_ERROR, "Invalid Token");
      console.log("Error when connecting:")
      console.log(e)
      client.disconnect(true);
      clearTimeout(timeout);
    }
  });


  client.on("voice:send_signal", async ({channelId, signalToUserId, signal}) => {
    const [requester] = await getConnectedUserBySocketID(client.id);
    const [isRequesterInVoice] = await voiceUserExists(channelId, requester.id);
    const [userToSignal] = await getUserInVoiceByUserId(signalToUserId);
    if (!isRequesterInVoice) {
      console.log("You must join the voice channel.")
      return;
    }
    if (userToSignal?.channelId !== channelId) {
      console.log("Recipient must join the voice channel.")
      return;
    }
    getIOInstance().to(userToSignal.socketId).emit(VOICE_SIGNAL_RECEIVED, {channelId, requesterId: requester.id, signal})
  })

  client.on("voice:send_return_signal", async ({channelId, signalToUserId, signal}) => {
    const [requester] = await getConnectedUserBySocketID(client.id);
    const [isRequesterInVoice] = await voiceUserExists(channelId, requester.id);
    const [userToSignal] = await getUserInVoiceByUserId(signalToUserId);
    if (!isRequesterInVoice) {
      console.log("You must join the voice channel.")
      return;
    }
    if (userToSignal?.channelId !== channelId) {
      console.log("Recipient must join the voice channel.")
      return;
    }
    getIOInstance().to(userToSignal.socketId).emit(VOICE_RETURN_SIGNAL_RECEIVED, {channelId, requesterId: requester.id, signal})
  })



  client.on("disconnect", async () => {
    if (!client.auth) return;
    const [user, error] = await getConnectedUserBySocketID(client.id);
    if (!user || error) return;
    const [presence] = await getPresenceByUserId(user.id);

    const [response] = await removeConnectedUser(user.id, client.id);

    const [callingUserDetails] = await getUserInVoiceByUserId(user.id);
    if (callingUserDetails && callingUserDetails.socketId === client.id) {
      await removeUserFromVoice(user.id)
      if (callingUserDetails.serverId) {
        getIOInstance().in("server:" + callingUserDetails.serverId).emit(USER_CALL_LEFT, {channelId: callingUserDetails.channelId, userId: user.id})
      }
    }

    // if all users have gone offline, emit offline status to friends.
    if (response === 1 && presence?.[1] !== '0') {
      emitUserStatus(user.id, user._id, 0, getIOInstance());
    } else {
      // remove program activity status if the socket id matches
      const [programActivity, error] = await getProgramActivityByUserId(user.id);
      if (!programActivity || error) return;
      const { socketID } = JSON.parse(programActivity);
      if (socketID === client.id) {
        await setProgramActivity(user.id, null);
        emitToAll(USER_PROGRAM_ACTIVITY_CHANGED, user._id, { user_id: user.id }, getIOInstance())
      }

    }
  });

  client.on("notification:dismiss", data =>
    events.notificationDismiss(data, client, getIOInstance())
  );

  client.on("programActivity:set", async data => {
    const [user, error] = await getConnectedUserBySocketID(client.id);

    if (error || !user) return;
    if (data) {
      if (data.name) {
        data.name = data.name.substring(0, 100)
      }
      if (data.status) {
        data.status = data.status.substring(0, 100)
      }
      const [result] = await setProgramActivity(user.id, { name: data.name, status: data.status, socketID: client.id })
      const json = JSON.parse(result[0])
      // only emit if: 
      // json is empty
      // json is not the same.
      if ((json && (json.name !== data.name || json.status !== data.status)) || (!json)) {
        emitToAll(USER_PROGRAM_ACTIVITY_CHANGED, user._id, { name: data.name, status: data.status, user_id: user.id }, getIOInstance())
      }
    } else {
      await setProgramActivity(user.id, null);
      emitToAll(USER_PROGRAM_ACTIVITY_CHANGED, user._id, { user_id: user.id }, getIOInstance())
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