const mongoose = require("mongoose");
const Users = require('./users');

const {
    Schema
} = mongoose;

const friendsSchema = new Schema({
    channelID: { type: String, unique: true, required: true },
    requester: { type: Schema.Types.ObjectId, ref: 'users'},
    recipient: { type: Schema.Types.ObjectId, ref: 'users'},
    status: {
      type: Number,
      enums: [
          0, //'requested',
          1, //'pending',
          2, //'friends'
      ]
    }
})


module.exports = mongoose.model('friends', friendsSchema);