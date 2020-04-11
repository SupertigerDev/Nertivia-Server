import Devices from "../models/Devices";
const FCM = require("fcm-node");
const serverKey = require("../fb-fcm.json");
const fcm = new FCM(serverKey);
import path from 'path';

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
  uniqueID: string;
  avatar: string;
}
interface Message {
  message: string;
  channelID: string;
  files: Files[];
}
interface Files {
  fileName: string;
  url: string;
}
interface Devices {
  token: string;
}

export default async function send(args: Args) {
  let requestToken: Devices[];

  if (args.isServer) {
    requestToken = ((await Devices.find({
      user_id: { $in: args.uniqueIDArr }
    })) as unknown) as Devices[];
  } else {
    if (!args.recipient) return;
    requestToken = ((await Devices.find({
      user: args.recipient._id
    })) as unknown) as Devices[];
  }

  if (!requestToken.length) return;

  const tokens = requestToken.map(t => t.token);
  let msgContent = "";


  if (args.message.message && args.message.message.trim() !== "") {
    msgContent = args.message.message;
  } else if (args.message.files.length) {
    if (args.message.files[0].fileName){
      msgContent = args.message.files[0].fileName;
    } else {
      msgContent = decodeURIComponent(path.basename(args.message.files[0].url));
    }
  }

  const message = {
    registration_ids: tokens,
    data: {}
  };

  if (args.isServer) {
    message.data = {
      username: args.user.username,
      channel_id: args.message.channelID,
      unique_id: args.user.uniqueID,
      server_id: args.channel.server.server_id,
      server_name: args.channel.server.name,
      channel_name: args.channel.name,
      avatar: args.channel.server.avatar,
      message:
        msgContent.length >= 500
          ? msgContent.substring(0, 500) + "..."
          : msgContent
    };
  } else {
    message.data = {
      username: args.user.username,
      channel_id: args.message.channelID,
      unique_id: args.user.uniqueID,
      avatar: args.user.avatar,
      message:
        msgContent.length >= 500
          ? msgContent.substring(0, 500) + "..."
          : msgContent
    };
  }

  fcm.send(message, async function(err: Error, response: any) {
    if (err) {
      console.log(err)
      console.log("Something has gone wrong!");
    } else {
      // remove all expired tokens from db.
      const failedTokens = response.results
        .map((r: any, i:any) => r.error && tokens[i])
        .filter((r:any) => r);
      await Devices.deleteMany({ token: { $in: failedTokens } });
    }
  });
}
