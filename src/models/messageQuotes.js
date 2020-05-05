const mongoose = require("mongoose");
const {
    Schema
} = mongoose;




const messageQuotesSchema = new Schema({
  message: String,
  messageID: String,
  quotedChannel: { type : Schema.Types.ObjectId, ref: 'channels' },
  creator: { type : Schema.Types.ObjectId, ref: 'users' }
});


const messageQuotes = mongoose.model('message_quotes', messageQuotesSchema);
module.exports = messageQuotes;