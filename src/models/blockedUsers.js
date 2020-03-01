const mongoose = require("mongoose");

const {
    Schema
} = mongoose;

const blockedUserSchema = new Schema({
    requester: { type: Schema.Types.ObjectId, ref: 'users'},
    recipient: { type: Schema.Types.ObjectId, ref: 'users'},
})


module.exports = mongoose.model('blocked_users', blockedUserSchema);