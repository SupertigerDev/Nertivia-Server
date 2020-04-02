const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const permissionsSchema = new Schema({
  send_message: Boolean
})

const channelsSchema = new Schema({
  name: {type: String},
  channelID: { type: String, required: true },
  visibility: {type: Boolean},
  creator: { type: Schema.Types.ObjectId, ref: 'users'},
  recipients: [{type: Schema.Types.ObjectId, ref: 'users'}],
  hide: {type: Boolean, select: false, required: false}, // only used for recent dms.
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String, required: false},
  lastMessaged: {type: Number},
  status: {
    type: Number,
    default: 0,
    enums: [
        0, //'not blocked',
        1, //'blocked',
    ]
  },
  permissions: {type: permissionsSchema, select: true,}
})


module.exports = mongoose.model('channels', channelsSchema);