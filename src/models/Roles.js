const mongoose = require("mongoose");
const {
    Schema
} = mongoose;




const serverRolesSchema = new Schema({
  name: {type: String, default: 'New Role'},
  id: {type: String},
  color: {type: String},
  hideRole: {type: Boolean},
  permissions:{type: Number, default: 0},
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String},
  default: {type: Boolean, default: false}, // prevents them from changing certain things eg: change name of the role.
  bot: {type: Schema.Types.ObjectId, ref: 'user'},
  deletable: {type: Boolean, default: true},
  order: {type: Number},
});



const serverRoles = mongoose.model('server_roles', serverRolesSchema);


module.exports = serverRoles;