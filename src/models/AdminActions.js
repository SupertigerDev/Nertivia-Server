const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const flake = require('../utils/genFlakeId').default;
const {
  Schema
} = mongoose;


const AdminActionsSchema = new Schema({
  action: {type: String, enum: [
    "SUSPEND",
    "UNSUSPEND",
    "IP_BAN",
    "APPROVE_THEME"
  ]},
  ip_ban: String,
  reason: String,
  admin: { type: Schema.Types.ObjectId, ref: 'users'},
  user: { type: Schema.Types.ObjectId, ref: 'users'},
  date: Number,
  expireAt: {
    type: Date,
    default: Date.now,
    index: {expires: 398999 } // 4.6 days
  },
});


const AdminActions = mongoose.model('admin_actions', AdminActionsSchema);


module.exports = AdminActions;