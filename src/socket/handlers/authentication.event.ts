import { Socket } from "socket.io";
import { AUTHENTICATED, AUTHENTICATION_ERROR } from "../../ServerEventNames";
import * as UserCache from '../../cache/User.cache';
import * as rateLimitCache from '../../cache/rateLimit.cache';


// emit and disconnect.
function disconnect(client: Socket, message: string) {
  client.emit(AUTHENTICATION_ERROR, message);
  client.disconnect(true);
}

interface Data {
  token?: string;
}

export async function onAuthentication(client: Socket, data: Data) {
  if (!data.token) return disconnect(client, 'Token not provided.')

  const userIp = (client.handshake.headers["cf-connecting-ip"] || client.handshake.headers["x-forwarded-for"] || client.handshake.address)?.toString();


  const ttl = await rateLimitCache.incrementAndCheck({
    userIp,
    expire: 120,
    name: "auth_event",
    requestsLimit: 20
  })
  
  if (ttl) return disconnect(client, "You are rate limited.");

  const [user, error] = await UserCache.authenticate({
    token: data.token,
    allowBot: true,
    userIp,
  })
  if (error) return disconnect(client, error);



  client.emit(AUTHENTICATED, {

  })


}