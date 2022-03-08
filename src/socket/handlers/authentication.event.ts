import { Socket } from "socket.io";
import { AUTHENTICATED, AUTHENTICATION_ERROR } from "../../ServerEventNames";
import * as UserCache from '../../cache/User.cache';
import * as rateLimitCache from '../../cache/rateLimit.cache';
import { getUserForSocketAuth } from "../../services/Users";
import { Server } from "../../models/Servers";
import { getChannelsByServerObjectIds, getOpenedDmChannels } from "../../services/Channels";
import { getMembersByServerObjectIds } from "../../services/ServerMembers";
import { getRolesByServerObjectIds } from "../../services/Roles";
import { Friend } from "../../models/Friends";
import removeDuplicatesFromArray from "../../utils/removeDuplicatesFromArray";


// emit and disconnect.
function disconnect(client: Socket, message: string | null) {
  client.emit(AUTHENTICATION_ERROR, message || "Something went wrong. try again later.");
  client.disconnect(true);
}

interface Data {
  token?: string;
}

export async function onAuthentication(client: Socket, data: Data) {
  if (!data.token) return disconnect(client, 'Token not provided.')

  const userIp = (client.handshake.headers["cf-connecting-ip"] || client.handshake.headers["x-forwarded-for"] || client.handshake.address)?.toString();


  const ttl = await rateLimitCache.incrementAndCheck({
    name: "auth_event",
    userIp,
    expire: 120,
    requestsLimit: 20
  })
  
  if (ttl) return disconnect(client, "You are rate limited.");

  // TODO: fix accept TOS not working in the future.
  const [cachedUser, error] = await UserCache.authenticate({
    token: data.token,
    allowBot: true,
    userIp,
  })
  if (error || !cachedUser) return disconnect(client, error);
  
  await UserCache.addConnectedUser({
    socketId: client.id,
    userId: cachedUser.id,
    customStatus: "",
    presence: 0
  })
  client.join(cachedUser.id);

  const user = await getUserForSocketAuth(cachedUser.id);
  if (!user) return disconnect(client, "User not found.");

  const dms = await getOpenedDmChannels(user._id)


  const {servers, serverMembers, serverRoles} = await handleServers(user.servers)



  // contains friends and server members user Ids.
  const userIds = removeDuplicatesFromArray([
    ...user.friends.map(friend => friend.recipient.id),
    ...serverMembers.map(member => member.member.id)
  ]);

  const presences = await UserCache.getPresenceByUserIds(userIds);

  console.log(presences);




  client.emit(AUTHENTICATED, {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      tag: user.tag,
      badges: user.badges,
      status: user.status,
      type: user.type,
      avatar: user.avatar,
      banner: user.banner,
      servers,
      friends: user.friends,
    },
    serverMembers,
    serverRoles,
    settings: {
      GDriveLinked: !!user?.GDriveRefreshToken,
    },
    dms
  })


}

async function handleServers(servers?: Server[]) {
  if (!servers?.length) return { servers: [], serverMembers: [], serverRoles: [] };
  const serverObjectIds = servers.map(server => server._id);
  // const serverIds = servers.map(server => server.server_id);

  const [channels, members, roles] = await Promise.all([
    getChannelsByServerObjectIds(serverObjectIds),
    getMembersByServerObjectIds(serverObjectIds),
    getRolesByServerObjectIds(serverObjectIds)
  ])
  const newServers = servers.map(server => {
    const serverChannels = channels.filter(channel => {channel.server.equals(server._id)})
    return {...server, channels: serverChannels}
  })
  return {
    servers: newServers,
    serverMembers: members,
    serverRoles: roles
  }

}
