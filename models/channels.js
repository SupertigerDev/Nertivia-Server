const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const channelsSchema = new Schema({
  channelID: { type: String, required: true },
  creator: { type: Schema.Types.ObjectId, ref: 'users'},
  recipients: [{type: Schema.Types.ObjectId, ref: 'users'}]
})


module.exports = mongoose.model('channels', channelsSchema);