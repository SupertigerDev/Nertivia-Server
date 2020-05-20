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
    await addToBulk(bulk, recipient_uniqueID, sender._id, channelID, message, false);
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

  if (!members_uniqueID.length) {
    return members_uniqueID;
  }

  for (let index = 0; index < members_uniqueID.length; index++) {
    const memberUniqueID = members_uniqueID[index];
    addToBulk(bulk, memberUniqueID, sender._id, channelID, message, true)
  }
  bulk.execute();
  return members_uniqueID;
}

function addToBulk(bulk, recipient_uniqueID, sender_id, channelID, message, isServer) {
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
  const find = {
    recipient: recipient_uniqueID,
    channelID
  }
  if (isServer) {
    find.count = { $lt: 100}
  }

  bulk
    .find(find).upsert()
    .update(
      {
        $inc: { count: 1 }
      },
    );
  return;
}

module.exports = sendNotification;
