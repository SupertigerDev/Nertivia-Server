import { Notifications } from "../models/Notifications";
import { unmutedServerChannelMembers } from "./ServerMembers";




export const getUserNotifications = async (userId: string) => {
  return await Notifications.find({ recipient: userId })
  .select(
    "mentioned type sender lastMessageID count recipient channelId -_id"
  )
  .populate({
    path: "sender",
    select: "avatar username id tag -_id"
  })
  .lean();
}



interface InsertNotificationOptions {
  channelId: string,
  messageId: string,
  senderObjectId: string,
  // users for servers
  serverObjectId?: string,
  mentionUserObjectIds?: string[] | any[]
  // used for dms
  recipientUserId?: string
}

// for DMs, they are notifications
// for servers, they are mention notifications.
export const insertNotification = async (opts: InsertNotificationOptions) => {
  // if its dm channel, run dm function
  if (opts.recipientUserId) {
    await insertDMNotification({
      recipientUserId: opts.recipientUserId,
      senderObjectId: opts.senderObjectId,
      channelId: opts.channelId,
      messageId: opts.messageId
    })
    return;
  }
  if (!opts.serverObjectId) return;

  if (!opts.mentionUserObjectIds?.length) return;

  // filter out self mentions.
  const mentionUserObjectIds = opts.mentionUserObjectIds.filter(objectId => objectId.toString() !== opts.senderObjectId.toString());
  if (!mentionUserObjectIds.length) return;

  const unmutedChannelMentionIds = await unmutedServerChannelMembers({
    channelId: opts.channelId,
    serverObjectId: opts.serverObjectId,
    userObjectIds: mentionUserObjectIds
  })
  if (!unmutedChannelMentionIds.length) return;
  const bulk = Notifications.collection.initializeUnorderedBulkOp();

  for (let i = 0; i < unmutedChannelMentionIds.length; i++) {
    const mentionedUserId = unmutedChannelMentionIds[i];
    addServerMentionToBulk(bulk, {
      channelId: opts.channelId,
      messageId: opts.messageId,
      userId: mentionedUserId,
      senderObjectId: opts.senderObjectId, 
    })
  }
  await bulk.execute();
  return;
}

interface ServerMentionOptions {
  userId: string,
  senderObjectId: string
  channelId: string,
  messageId: string
}

function addServerMentionToBulk(bulk: any, opts: ServerMentionOptions) {
  const $set = {
    recipient: opts.userId,
    channelId: opts.channelId,
    type: "MESSAGE_CREATED",
    sender: opts.senderObjectId,
    mentioned: true,
  };
  const find = {
    recipient: opts.userId,
    channelId: opts.channelId
  }

  bulk
    .find(find)
    .upsert()
    .update({$set, $setOnInsert: { lastMessageID: opts.messageId }, $inc: { count: 1 }});
}


interface DMNotificationOptions {
  recipientUserId: string,
  senderObjectId: string
  channelId: string,
  messageId: string
}

function insertDMNotification(opts: DMNotificationOptions) {  
  const $set = {
    recipient: opts.recipientUserId,
    channelId: opts.channelId,
    type: "MESSAGE_CREATED",
    sender: opts.senderObjectId
  };
  
  const find = {
    recipient: opts.recipientUserId,
    channelId: opts.channelId
  }
  return Notifications.updateOne(find, {$set, $setOnInsert: { lastMessageID: opts.messageId}, $inc: { count: 1 }}, {upsert: true})
}