const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const channelsSchema = new Schema({
  name: {type: String},
  channelID: { type: String, required: true },
  visibility: {type: Boolean},
  creator: { type: Schema.Types.ObjectId, ref: 'users'},
  recipients: [{type: Schema.Types.ObjectId, ref: 'users'}],
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  lastMessaged: {type: Number},
  status: {
    type: Number,
    default: 0,
    enums: [
        0, //'requested',
        1, //'blocked',
    ]
  }
})


module.exports = mongoose.model('channels', channelsSchema);