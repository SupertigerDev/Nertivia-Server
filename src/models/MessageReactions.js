const mongoose = require("mongoose");
const flake = require('../utils/genFlakeId').default;

const {
  Schema
} = mongoose;


const messageReactionsSchema = new Schema({
  messageID: String,
  emojiID: String,
  unicode: String,
  gif: Boolean,
  reactedBy: [{ type : Schema.Types.ObjectId, ref: 'users' }],
})





module.exports = mongoose.model('message_reactions', messageReactionsSchema);