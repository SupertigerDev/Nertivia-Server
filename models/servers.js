const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;




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

    // generate uniqueID
    this.server_id = generateNum(18);

    // Date created
    this.created = Date.now();
    next();

  } catch(error) {
    next(error);
  }
})



function generateNum(n) {
  var add = 1, max = 12 - add;   // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

  if ( n > max ) {
          return generateNum(max) + generateNum(n - max);
  }

  max        = Math.pow(10, n+add);
  var min    = max/10; // Math.pow(10, n) basically
  var number = Math.floor( Math.random() * (max - min + 1) ) + min;

  return ("" + number).substring(add); 
}


serversSchema.plugin(beautifyUnique);
const Servers = mongoose.model('servers', serversSchema);


module.exports = Servers;