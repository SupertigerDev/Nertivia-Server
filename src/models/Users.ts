import {model, Schema} from 'mongoose';
import bcrypt from 'bcryptjs';
import flake from '../utils/genFlakeId'



interface AboutMe {
  name: string;
  gender: string
  age: string
  continent: string
  country: string
  about_me: string
  "Suspend Reason": string
}

interface Appearance {
  own_message_right:boolean
  "12h_time": boolean
}

interface Settings {
  apperance: Appearance
  server_position: string[]
}

interface User {
  email: string
  banned: boolean
  email_confirm_code: string
  reset_password_code: string,
  ip: string
  username: string,
  tag: string,
  password: string
  passwordVersion: number,
  id: string
  lastSeen: number,
  avatar: string,
  banner: string
  custom_status: string
  status: number,
  type: string
  friends: any[]
  servers: any[]
  created: number
  show_welcome: boolean
  badges: number
  htmlProfile: string
  about_me: AboutMe
  settings: Settings
  GDriveRefreshToken: string,
  readTerms: boolean,

  bot: boolean
  createdBy: any
  botPrefix: string
  botCommands: any[]
}


const aboutMeSchema = new Schema<AboutMe>({
  name: { type: String },
  gender: { type: String },
  age: { type: String },
  continent: { type: String },
  country: { type: String },
  about_me: { type: String },
  "Suspend Reason": { type: String }
})


const appearanceSchema = new Schema<Appearance>({
  own_message_right: { type: Boolean, default: false, required: false }, // make own messages appear on the right (for own client) settings
  "12h_time": { type: Boolean, default: false, required: false }, // Change time to 12 hour.

})

const settingsSchema = new Schema<Settings>({
  apperance: { type: appearanceSchema },
  server_position: [{ type: String, required: false }]
})


const schema = new Schema<User>({
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
  id: {
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
  banner: {
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
  show_welcome: { // show welcome popout when not completed/ notclosed
    type: Boolean,
    default: true,
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
  htmlProfile: {type: String, select: false, required: false},
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

schema.pre('save', async function (next) {
  try {
    if (!this.bot) {
      // Generate salt
      const salt = await bcrypt.genSalt(10);
      // Generate a password hash
      const passwordHash = await bcrypt.hash(this.password, salt)
      // Re-assign original password
      this.password = passwordHash;
    }

    this.id = flake.gen();

    // generate tag
    this.tag = generateString(4);
    if (!this.bot) {
      this.email_confirm_code = generateString(10)
    }
    // Date created
    this.created = Date.now();
    next();

  } catch (error: any) {
    next(error);
  }
})

schema.methods.isValidPassword = async function (newPassword) {
  try {
    return await bcrypt.compare(newPassword, this.password);
  } catch (error: any) {
    throw new Error(error);
  }
}


function generateString(n: number) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = n;
  var randomString = '';
  for (var i = 0; i < string_length; i++) {
    var rNum = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(rNum, rNum + 1);
  }
  return randomString;
}

export const Users = model<User>('users', schema);

