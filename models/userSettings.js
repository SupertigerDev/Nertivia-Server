const mongoose = require("mongoose");
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const bcrypt = require('bcryptjs');
const {
    Schema
} = mongoose;

const usersSchema = new Schema({

  
});


const Users = mongoose.model('users', usersSchema);


module.exports = Users;