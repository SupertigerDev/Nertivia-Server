const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;




const serverMembersSchema = new Schema({

  member: { type: Schema.Types.ObjectId, ref: 'users'},
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  type: {type: String, default: "MEMBER", enum: ['MEMBER','OWNER', 'ADMIN']}

});



serverMembersSchema.plugin(beautifyUnique);
const serverMembers = mongoose.model('server_members', serverMembersSchema);


module.exports = serverMembers;