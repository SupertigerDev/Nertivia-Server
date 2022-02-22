import { Socket } from "socket.io";
import { AUTHENTICATED, AUTHENTICATION_ERROR } from "../../ServerEventNames";
import * as UserCache from '../../cache/User.cache';


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

  const userIP = (client.handshake.headers["cf-connecting-ip"] || client.handshake.headers["x-forwarded-for"] || client.handshake.address)?.toString();

  const [user, error] = await UserCache.authenticate({
    token: data.token,
    allowBot: true,
    userIP,
  })
  if (error) return disconnect(client, error);

  client.emit(AUTHENTICATED, {

  })


}