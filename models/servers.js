const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;

const FlakeId = require('flakeid');
const flake = new FlakeId();



const serversSchema = new Schema({
    name: {
      type: String,
      required: true,
    },
    avatar: {type: String, default: 'default.png'},
    creator: {type: Schema.Types.ObjectId, ref: 'users'},
    server_id: {
      type: String,
      unique: true
    },
    created: {
      type: Number
    },
    default_channel_id: {type: String}
});

serversSchema.pre('save', async function(next) {
  try {

    this.server_id = flake.gen();

    // Date created
    this.created = Date.now();
    next();

  } catch(error) {
    next(error);
  }
})





serversSchema.plugin(beautifyUnique);
const Servers = mongoose.model('servers', serversSchema);


module.exports = Servers;