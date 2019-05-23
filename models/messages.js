const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const messagesSchema = new Schema({
  channelID: { type: String, required: true },
  messageID: { type: String, required: true, unique: true },
  files: { type: Array, required: false },
  message: { type: String, required: false  },
  creator: { type: Schema.Types.ObjectId, ref: 'users' },
  created: { type: Number },
  type: {type: Number, default: 0, enum: [
    0, // Message
    1, // Join message
    2, // leave message
  ]}
})

messagesSchema.pre('save', function() {
  this.messageID = generateNum(22);
  this.created = Date.now();
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

module.exports = mongoose.model('messages', messagesSchema);