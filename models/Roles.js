const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const {
    Schema
} = mongoose;




const serverRolesSchema = new Schema({
  name: {type: String, default: 'New Role'},
  id: {type: String},
  color: {typ: String},
  permissions:{type: Number, default: 0},
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String},
  default: {type: Boolean, default: false}, // prevents them from changing certain things eg: change name of the role.
  deletable: {type: Boolean, default: true},

});



serverRolesSchema.plugin(beautifyUnique);
const serverRoles = mongoose.model('server_roles', serverRolesSchema);


module.exports = serverRoles;