const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;

const usersSchema = new Schema({
    email: {
        type: String,
        required: [true, "Email has not been entered."],
        minlength: [5, "Email must be more than 5 characters long."],
        unique: 'This email is already used!',
        select: false
    },
    username: {
        type: String,
        required: [true, "Username has not been entered."],
        minlength: [3, "Username must be more than 5 characters long."],
    },
    tag: {
        type: String,
        minlength: 4
    },
    password: {
        type: String,
        required: true,
        minlength: 3,
        select: false
    },
    uniqueID: {
        type: String,
        unique: true
    },
    lastSeen: {
        type: Number,
        default: 0
    },
    avatar: {
        type: String,
        default: 'default.png'
    },
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
    admin: {
      type: Number,
      default: 0,
      enum: [
          0, // Peasant 
          1, // Admin
          2, // Mod
          3, // Creator,
          4, // cute
      ]
  },
    friends: [{type: Schema.Types.ObjectId, ref: 'friends', select: false}],
    created: {
        type: Number
    },
    GDriveRefreshToken: {type: String, required: false, select: false}
});

usersSchema.pre('save', async function(next) {
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Generate a password hash
    const passwordHash = await bcrypt.hash(this.password, salt)
    // Re-assign original password
    this.password = passwordHash;

    // generate uniqueID
    this.uniqueID = generateNum(18);
    // generate tag
    this.tag = generateString(4);
    // Date created
    this.created = Date.now();

  } catch(error) {
    next(error);
  }
})

usersSchema.methods.isValidPassword = async function(newPassword) {
  try {
    return await bcrypt.compare(newPassword, this.password);
  } catch(error) {
    throw new Error(error);
  }
}

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

function generateString(n) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = n;
  var randomstring = '';
  for (var i=0; i<string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum,rnum+1);
  }
  return randomstring;
}

usersSchema.plugin(beautifyUnique);
const Users = mongoose.model('users', usersSchema);


module.exports = Users;