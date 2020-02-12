
const Messages = require('./../models/messages');
const ServerMembers = require('./../models/ServerMembers');
const Notifications = require('./../models/notifications');


// recipient_uniqueID: Only required for DMs.
// server_id: Only required for server messages.
async function sendNotification({message, server_id, recipient_uniqueID, channelID, sender}) {

  // If messages are to be sent to dm.
  if (recipient_uniqueID) {
    await findOneAndUpdate(recipient_uniqueID, sender._id, channelID, message);
    return;
  }

  // if a message to be send in a server
  //find all members in the server.
  const members = await ServerMembers.find({
    server: server_id
  }).populate("member");

  // Convert JSON Array to array of uniqueID 
  const members_uniqueID = members
    .map(m => m.member.uniqueID)
    .filter(m => m !== sender.uniqueID);

  let notificationPromises = [];
  for await (const memberUniqueID of members_uniqueID) {
    notificationPromises.push(findOneAndUpdate(memberUniqueID, sender._id, channelID, message));
  }
  await Promise.all(notificationPromises);
  return members_uniqueID;
}

function findOneAndUpdate (recipient_uniqueID, sender_id, channelID, message) {

  const $set = {
    recipient: recipient_uniqueID,
    channelID,
    type: "MESSAGE_CREATED",
    lastMessageID: message.messageID,
    sender: sender_id
  }
  const mentioned = message.mentions && !!message.mentions.find(m => m.uniqueID === recipient_uniqueID);
  if (mentioned) {
    $set.mentioned = true;
  }

  return Notifications.findOneAndUpdate({
    recipient: recipient_uniqueID,
    channelID
  },{
    $set,
    $inc: {
      count: 1
    }
  },{
    upsert: true
  })
}

module.exports = sendNotification;