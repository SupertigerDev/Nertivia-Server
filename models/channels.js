const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const channelsSchema = new Schema({
  channelID: { type: String, required: true },
  visibility: {type: Boolean},
  creator: { type: Schema.Types.ObjectId, ref: 'users'},
  recipients: [{type: Schema.Types.ObjectId, ref: 'users'}],
  lastMessaged: {type: Number}
})


module.exports = mongoose.model('channels', channelsSchema);