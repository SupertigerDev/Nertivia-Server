const mongoose = require("mongoose");

const {
    Schema
} = mongoose;




const bannedIPsSchema = new Schema({
  ip: {type: String, unique: true},
  expireAt: {
    type: Date,
    default: Date.now,
    index: {expires: 398999 } // 4.6 days
  },
});



const userIPs = mongoose.model('banned_ips', bannedIPsSchema);


module.exports = userIPs;