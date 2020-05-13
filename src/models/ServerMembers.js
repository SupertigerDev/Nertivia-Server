const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;




const serverMembersSchema = new Schema({

  member: { type: Schema.Types.ObjectId, ref: 'users'},
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String},
  type: {type: String, default: "MEMBER", enum: ['MEMBER','OWNER', 'ADMIN', 'BOT']},
  roles: [{type: String, required: false, select: false}],
  muted_channels: [{type: String, required: false, select: false}]

});



serverMembersSchema.plugin(beautifyUnique);
const serverMembers = mongoose.model('server_members', serverMembersSchema);


module.exports = serverMembers;