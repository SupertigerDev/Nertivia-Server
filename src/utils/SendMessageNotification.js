const Messages = require("./../models/messages");
const ServerMembers = require("./../models/ServerMembers");
const Notifications = require("./../models/notifications");

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
    await addToBulk(bulk, recipient_uniqueID, sender._id, channelID, message);
    bulk.execute();
    return;
  }

  // if a message to be send in a server
  //find all members in the server.
  const members = await ServerMembers.find({
    server: server_id,
    muted_channels: { $ne: channelID }
  }).populate("member");

  // Convert JSON Array to array of uniqueID
  const members_uniqueID = members
    .map(m => m.member.uniqueID)
    .filter(m => m !== sender.uniqueID);

  for await (const memberUniqueID of members_uniqueID) {
    addToBulk(bulk, memberUniqueID, sender._id, channelID, message)
  }
  bulk.execute();
  return members_uniqueID;
}

function addToBulk(bulk, recipient_uniqueID, sender_id, channelID, message) {
  const $set = {
    recipient: recipient_uniqueID,
    channelID,
    type: "MESSAGE_CREATED",
    lastMessageID: message.messageID,
    sender: sender_id
  };
  const mentioned =
    message.mentions &&
    !!message.mentions.find(m => m.uniqueID === recipient_uniqueID);
  if (mentioned) {
    $set.mentioned = true;
  }

  bulk
    .find({
      recipient: recipient_uniqueID,
      channelID
    }).upsert()
    .update(
      {
        $set,
        $inc: { count: 1 }
      },
    );
    return;
}

module.exports = sendNotification;
