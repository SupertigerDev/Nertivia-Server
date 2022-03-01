import { Socket } from "socket.io";
import { AUTHENTICATED, AUTHENTICATION_ERROR } from "../../ServerEventNames";
import * as UserCache from '../../cache/User.cache';
import * as rateLimitCache from '../../cache/rateLimit.cache';


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
  const [user, error] = await UserCache.authenticate({
    token: data.token,
    allowBot: true,
    userIp,
  })
  if (error || !user) return disconnect(client, error);
  
  await UserCache.addConnectedUser({
    socketId: client.id,
    userId: user.id,
    customStatus: "",
    presence: 0
  })


  client.emit(AUTHENTICATED, {

  })


}