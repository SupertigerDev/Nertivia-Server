const Messages = require("./../models/messages");
const ServerMembers = require("./../models/ServerMembers");
const Notifications = require("./../models/notifications");
const messages = require("./../models/messages");

// recipient_uniqueID: Only required for DMs.
// server_id: Only required for server messages.
async function sendNotification({
  message,
  server_id,
  recipient_uniqueID,
  channelID,
  sender
}) {
  const bulk = Notifications.collection.initializeUnorderedBulkOp();
  // If messages are to be sent to dm.
  if (recipient_uniqueID) {
    await addToBulk(bulk, recipient_uniqueID, sender._id, channelID, message, false);
    bulk.execute();
    return;
  }

  // server
  // TODO: clean the code later on. This is only used for server mentions now.
  if (!message.mentions || !message.mentions.length) return;
  // filter mentions to joined mentioned members
  let filteredMentions = await ServerMembers.find({ muted_channels: { $ne: channelID }, muted: { $ne: 2 }, server: server_id, member: {$in: message.mentions.map(m => m._id)}}, {_id: 0}).select("member").lean();

  filteredMentions = message.mentions.filter(({_id}) => filteredMentions.find(({member}) => member.toString() === _id.toString()) && _id.toString() !== sender._id.toString())
  if (!filteredMentions.length) return;

  for (let i = 0; i < filteredMentions.length; i++) {
    const member = filteredMentions[i];
    addServerMentioned(bulk, member.uniqueID, sender._id, channelID, message);
  }
  bulk.execute();
  return;
}


function addServerMentioned(bulk, recipient_uniqueID, sender_id, channelID, message, isServer) {
  const $set = {
    recipient: recipient_uniqueID,
    channelID,
    type: "MESSAGE_CREATED",
    sender: sender_id,
    mentioned: true,
  };
  const find = {
    recipient: recipient_uniqueID,
    channelID
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



function addToBulk(bulk, recipient_uniqueID, sender_id, channelID, message, isServer) {
  const $set = {
    recipient: recipient_uniqueID,
    channelID,
    type: "MESSAGE_CREATED",
    sender: sender_id
  };
  const mentioned =
    message.mentions &&
    !!message.mentions.find(m => m.uniqueID === recipient_uniqueID);
  if (mentioned) {
    $set.mentioned = true;
  }
  const find = {
    recipient: recipient_uniqueID,
    channelID
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
