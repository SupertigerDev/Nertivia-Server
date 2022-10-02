import { Socket } from "socket.io";
import { onAuthentication } from "./authentication.event";
import { onDisconnect } from "./disconnect.event";
import { onNotificationDismiss } from "./notificationDismiss.event";
import { onProgramActivitySet } from "./programActivitySet.event";
import { onVoiceSendReturnSignal } from "./voiceSendReturnSignal.event";
import { onVoiceSendSignal } from "./voiceSendSignal.event";

export function onConnection(client: Socket) {
  
  client.on("authentication", data => onAuthentication(client, data));
  client.on("disconnect", () => onDisconnect(client));

  client.on("notification:dismiss", data => onNotificationDismiss(client, data));
  client.on("programActivity:set", data => onProgramActivitySet(client, data));
  
  client.on("voice:send_signal", data => onVoiceSendSignal(client, data));
  client.on("voice:send_return_signal", data => onVoiceSendReturnSignal(client, data));

}