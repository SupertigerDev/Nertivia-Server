import Devices from "../models/Devices";
const serverKey = require("../fb-fcm.json");
import path from 'path';
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.cert(serverKey)
});

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
  files?: Files[];
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
  } else if (args.message.files!!.length) {
    if (args.message.files!![0].fileName){
      msgContent = args.message.files!![0].fileName;
    } else {
      msgContent = decodeURIComponent(path.basename(args.message.files!![0].url));
    }
  }

  const registration_ids = tokens;
  const message: any = {
    data: {},
  };

  if (args.isServer) {
    message.data = {
      username: args.user.username,
      channel_id: args.message.channelID,
      unique_id: args.user.uniqueID,
      server_id: args.channel.server.server_id,
      server_name: args.channel.server.name,
      channel_name: args.channel.name,
      message:
        msgContent.length >= 500
          ? msgContent.substring(0, 500) + "..."
          : msgContent
    };
    if (args.channel.server.avatar) {
      message.data.avatar = args.channel.server.avatar;
    }
  } else {
    message.data = {
      username: args.user.username,
      channel_id: args.message.channelID,
      unique_id: args.user.uniqueID,
      message:
        msgContent.length >= 500
          ? msgContent.substring(0, 500) + "..."
          : msgContent
    };
    if (args.user.avatar) {
      message.data.avatar = args.user.avatar;
    }
  }

  admin.messaging().sendToDevice(registration_ids, message, {priority: "high"})
    .then(async res => {
      const failedTokens = res.results.map((token, index) => token.error && tokens[index]).filter(r => r);
      if (failedTokens.length) {
        await Devices.deleteMany({ token: { $in: failedTokens } });
      }
    })
    .catch(err => {
      console.log("FCM> Something went wrong");
      console.log(err);
    })
}
