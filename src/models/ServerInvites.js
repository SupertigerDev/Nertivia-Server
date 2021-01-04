const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;


const serverInvitesSchema = new Schema({
  server: { type: Schema.Types.ObjectId, ref: 'servers', required: true, select: false },
  creator: { type: Schema.Types.ObjectId, ref: 'users', required: true, select: false },
  invite_code: { type: String, unique: true, required: true },
  uses: { type: Number, default: 0, select: false},
  custom: {type: Boolean}
})



const serverInvites = mongoose.model('server_invite', serverInvitesSchema);


module.exports = serverInvites;