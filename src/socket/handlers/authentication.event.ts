import { Socket } from "socket.io";
import { AUTHENTICATION_ERROR } from "../../ServerEventNames";
import * as JWT from '../../utils/JWT';
interface Data {
  token?: string;
}

export async function onAuthentication(client: Socket, data: Data) {
  if (!data.token) return disconnect(client, 'Token not provided.')
  const tokenDetails = await JWT.decodeToken(data.token).catch(() => {});
  if (!tokenDetails) return disconnect(client, 'Token is invalid.');

}


// emit and disconnect.
function disconnect(client: Socket, message: string) {
  client.emit(AUTHENTICATION_ERROR, message);
  client.disconnect(true);
}