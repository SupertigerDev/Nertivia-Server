const mongoose = require("mongoose");


const {
  Schema
} = mongoose;
// type MESSAGE_CREATED
const notificationsSchema = new Schema({
  recipient: { type: String, required: true },
  type: { type: String, required: true },
  // guildID: { type: String, required: false },
  mentioned: {type: Boolean},
  channelID: { type: String, required: false },
  lastMessageID: {type: String, required: false },
  sender: { type: Schema.Types.ObjectId, ref: 'users', required: false},
  count: {type: Number, required: false }
})


module.exports = mongoose.model('notifications', notificationsSchema);