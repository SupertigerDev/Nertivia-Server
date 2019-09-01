const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;




const serversListSchema = new Schema({
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  id: {type: String},
  description: {type: String},
  created: {type: Number, default: 0},
  creator: {type: Schema.Types.ObjectId, ref: 'users'},
  verified: {type: Boolean}
});



serversListSchema.pre('save', async function(next) {
  // Date created
  this.created = Date.now();
  next();
})



serversListSchema.plugin(beautifyUnique);
const serversList = mongoose.model('public_servers', serversListSchema);


module.exports = serversList;