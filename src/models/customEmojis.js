const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const customEmojisSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'users', required: true},
  name: { type: String, required: true},
  emojiID: {type: String, required: true},
  gif: {type: Boolean}
})


module.exports = mongoose.model('customEmojis', customEmojisSchema);