const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const flake = require('../utils/genFlakeId').default;
const {
  Schema
} = mongoose;


const aboutMeSchema = new Schema({
  name: { type: String },
  gender: { type: String },
  age: { type: String },
  continent: { type: String },
  country: { type: String },
  about_me: { type: String },
  "Suspend Reason": { type: String }
})


const apperanceSchema = new Schema({
  own_message_right: { type: Boolean, default: false, required: false }, // make own messages appear on the right (for own client) settings
  "12h_time": { type: Boolean, default: false, required: false }, // Change time to 12 hour.

})

const settingsSchema = new Schema({
  apperance: { type: apperanceSchema },
  server_position: [{ type: String, required: false }]
})


const usersSchema = new Schema({
  email: {
    type: String,
    unique: false,
    select: false
  },
  banned: { type: Boolean },
  email_confirm_code: { type: String, select: false },
  reset_password_code: {
    type: String,
    select: false,
    index: { expires: 43200 } // 12 hours
  },
  ip: {
    type: String,
    select: false,
  },
  username: {
    type: String,
    required: [true, "Username has not been entered."],
    minlength: [3, "Username must be more than 3 characters long."],
  },
  tag: {
    type: String,
    minlength: 4
  },
  password: {
    type: String,
    minlength: 3,
    select: false
  },
  passwordVersion: {
    type: Number,
    select: false,
  },
  uniqueID: {
    type: String,
    unique: true
  },
  lastSeen: {
    type: Number,
    default: 0,
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  custom_status: { type: String, select: false },
  status: {
    type: Number,
    default: 1,
    enum: [
      0, // Offline
      1, // Online
      2, // Away
      3, // Busy
      4 // Looking to play
    ]
  },
  type: {
    type: String,
    enum: [
      "CREATOR",
      "ADMIN"
    ]
  },
  friends: {
    type: [{ type: Schema.Types.ObjectId, ref: 'friends' }],
    select: false
  },
  servers: {
    type: [{ type: Schema.Types.ObjectId, ref: 'servers'}],
    select: false
  },
  created: {
    type: Number
  },
  survey_completed: { //if about_me is completed or not.
    type: Boolean,
    default: false,
    select: false
  },
  badges: {
    // "CREATOR": 1,
    // "CUTE": 2,
    // "DEVELOPER": 4,
    // "SUPPORTER": 8,
    // "IDEA_QUEEN": 16,
    // "BUG_CATCHER": 32,
    // "TRANSLATOR": 64,
    // "CONTRIBUTOR": 128
    type: Number,
    select: false,
  },
  about_me: {
    type: aboutMeSchema,
    select: false
  },
  settings: { type: settingsSchema, select: false },
  GDriveRefreshToken: { type: String, required: false, select: false }, // TODO move this to settings
  readTerms: {type: Boolean, select: false, default: true},

  // used for bots only
  bot: { type: Boolean, require: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: false, select: false },
  botPrefix: {
    type: String,
    select: false,
    required: false,
  },
  botCommands: {
    type: [{ type: Object }],
    select: false,
    required: false,
  }
});

usersSchema.pre('save', async function (next) {
  try {
    if (!this.bot) {
      // Generate salt
      const salt = await bcrypt.genSalt(10);
      // Generate a password hash
      const passwordHash = await bcrypt.hash(this.password, salt)
      // Re-assign original password
      this.password = passwordHash;
    }

    // generate uniqueID
    this.uniqueID = flake.gen();
    // generate tag
    this.tag = generateString(4);
    if (!this.bot) {
      this.email_confirm_code = generateString(10)
    }
    // Date created
    this.created = Date.now();
    next();

  } catch (error) {
    next(error);
  }
})

usersSchema.methods.isValidPassword = async function (newPassword) {
  try {
    return await bcrypt.compare(newPassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
}


function generateString(n) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = n;
  var randomstring = '';
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

const Users = mongoose.model('users', usersSchema);


module.exports = Users;