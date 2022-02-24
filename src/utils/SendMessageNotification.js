import {ServerMembers} from "../models/ServerMembers";
import {Notifications} from '../models/Notifications'



// recipientUserID: Only required for DMs.
// server_id: Only required for server messages.
async function sendNotification({
  message,
  server_id,
  recipientUserID,
  channelId,
  sender
}) {
  const bulk = Notifications.collection.initializeUnorderedBulkOp();
  // If messages are to be sent to dm.
  if (recipientUserID) {
    await addToBulk(bulk, recipientUserID, sender._id, channelId, message, false);
    bulk.execute();
    return;
  }

  // server
  // TODO: clean the code later on. This is only used for server mentions now.
  if (!message.mentions || !message.mentions.length) return;
  // filter mentions to joined mentioned members
  let filteredMentions = await ServerMembers.find({ muted_channels: { $ne: channelId }, muted: { $ne: 2 }, server: server_id, member: {$in: message.mentions.map(m => m._id)}}, {_id: 0}).select("member").lean();

  filteredMentions = message.mentions.filter(({_id}) => filteredMentions.find(({member}) => member.toString() === _id.toString()) && _id.toString() !== sender._id.toString())
  if (!filteredMentions.length) return;

  for (let i = 0; i < filteredMentions.length; i++) {
    const member = filteredMentions[i];
    addServerMentioned(bulk, member.id, sender._id, channelId, message);
  }
  bulk.execute();
  return;
}


function addServerMentioned(bulk, recipientUserID, sender_id, channelId, message, isServer) {
  const $set = {
    recipient: recipientUserID,
    channelId,
    type: "MESSAGE_CREATED",
    sender: sender_id,
    mentioned: true,
  };
  const find = {
    recipient: recipientUserID,
    channelId
  }

  bulk
    .find(find).upsert()
    .update(
      {
        $set,
        $setOnInsert: { lastMessageID: message.messageID },
        $inc: { count: 1 }
      },
    );
  return;
}



function addToBulk(bulk, recipientUserID, sender_id, channelId, message, isServer) {
  const $set = {
    recipient: recipientUserID,
    channelId,
    type: "MESSAGE_CREATED",
    sender: sender_id
  };
  const mentioned =
    message.mentions &&
    !!message.mentions.find(m => m.id === recipientUserID);
  if (mentioned) {
    $set.mentioned = true;
  }
  const find = {
    recipient: recipientUserID,
    channelId
  }

  bulk
    .find(find).upsert()
    .update(
      {
        $set,
        $setOnInsert: { lastMessageID: message.messageID },
        $inc: { count: 1 }
      },
    );
  return;
}

module.exports = sendNotification;
