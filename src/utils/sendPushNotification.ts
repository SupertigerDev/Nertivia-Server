import admin, { messaging } from 'firebase-admin'
import {Devices} from '../models/Devices';
let serverKey: any;
try {
  serverKey = require("../fb-fcm.json");
} catch {
  console.log("Warning> fb-fcm.json was not provided. Mobile push notifications will not work.")
}
import path from 'path';
import {Servers} from "../models/Servers";

if (serverKey) {
  admin.initializeApp({
    credential: admin.credential.cert(serverKey)
  });
}

interface Args {
  isServer: boolean;
  user: User;
  recipient?: User;
  message: Message;
  uniqueIDArr?: string[];
  channel?: any;
}
interface User {
  _id: string;
  username: string;
  id: string;
  avatar: string;
}
interface Message {
  message?: string;
  channelId: string;
  files?: Files[];
}
interface Files {
  fileName: string;
  url: string;
}
interface Devices {
  token: string;
}

interface DMArgs {
  recipient: User;
  sender: User;
  message: Message;
}
interface ServerArgs {
  sender: User;
  message: Message;
  server_id: string;
  channel: any;
}

export async function sendDMPush(args: DMArgs) {
  if (!serverKey) return;
  const devices = (await Devices.find({user: args.recipient._id}) as any) as Devices[];
  if (!devices.length) return;
  const tokensArr = devices.map(t => t.token);

  const data: any = {
    username: args.sender.username,
    channel_id: args.message.channelId,
    user_id: args.sender.id,
    message: contentBuilder(args.message)
  }
  if (args.sender.avatar) {
    data.avatar = args.sender.avatar;
  }

  sendToDevice(tokensArr, data);

}
export async function sendServerPush(args: ServerArgs) {
  if (!serverKey) return;
  const devices = await Servers.findOne({server_id: args.server_id}).select("FCM_devices").populate("FCM_devices") as any;
  if (!devices.FCM_devices || !devices.FCM_devices.length) return;
  const tokensArr = devices.FCM_devices.filter((d: any) => d.user_id !== args.sender.id).map((t: any) => t.token);
  if (!tokensArr.length) return; 
  const data: any = {
    username: args.sender.username,
    channel_id: args.message.channelId,
    user_id: args.sender.id,
    server_id: args.channel.server.server_id,
    server_name: args.channel.server.name,
    channel_name: args.channel.name,
    message: contentBuilder(args.message)
  }
  if (args.channel.server.avatar) {
    data.avatar = args.channel.server.avatar;
  }
  sendToDevice(tokensArr, data);
}


function sendToDevice(tokenArr: string[], data: any) {
  if (!serverKey) return;
  admin.messaging().sendToDevice(tokenArr, {data}, {priority: "high"})
  .then(async res => {
    const failedTokens = res.results.map((token, index) => token.error && tokenArr[index]).filter(r => r);
    if (failedTokens.length) {
      const devices = (await Devices.find({ token: { $in: failedTokens as string[] } }).select("_id") as any);
      const devicesIDArr = devices.map((d: any) => d._id);
      // delete from servers
      await Servers.updateMany({FCM_devices: {$in: devicesIDArr}}, {$pullAll: {FCM_devices: devicesIDArr}})
      await Devices.deleteMany({ _id: { $in: devicesIDArr } });
    }
  })
  .catch(err => {
    console.log("FCM> Something went wrong");
    console.log(err);
  })
}


// join /create server 
export async function AddFCMUserToServer(server_id: string, user_id: string) {
  if (!serverKey) return;
  const devices = await Devices.find({user_id});
  if (!devices.length) return;
  const deviceIDArr = devices.map((d: any) => d._id)
  await Servers.updateOne({server_id}, {$addToSet: {FCM_devices: deviceIDArr}});
}

// leave, kick, banned from server
export async function deleteFCMFromServer(server_id: string, user_id: string) {
  if (!serverKey) return;
  const devices = await Devices.find({user_id});
  if (!devices.length) return;
  const deviceIDArr = devices.map((d: any) => d._id)
  await Servers.updateOne({server_id}, {$pullAll: {FCM_devices: deviceIDArr}});
}

// suspended / account deleted from nertivia
export async function deleteAllUserFCM(user_id: string) {
  if (!serverKey) return;
  const devices = await Devices.find({user_id});
  if (!devices.length) return;
  const deviceIDArr = devices.map((d: any) => d._id)
  await Servers.updateMany({FCM_devices: {$in: deviceIDArr}}, {$pullAll: {FCM_devices: deviceIDArr}});
  await Devices.deleteMany({ _id: { $in: deviceIDArr } });

}

function contentBuilder(message: Message) {
  let content = "";
  if (message.message?.trim()) {
    content = message.message;
  } else if (message.files?.length) {
    const file = message.files[0];
    content = file.fileName || decodeURIComponent(path.basename(file.url));
  }
  if (content.length >= 500) {
    return content.substring(0, 500) + "..."
  }
  return content;
}