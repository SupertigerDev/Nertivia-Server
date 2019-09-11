const mongoose = require("mongoose");


const {
  Schema
} = mongoose;

const devicesSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'users'},
  token: {type: String, unique: true},
  platform: { type: String },
})


module.exports = mongoose.model('devices', devicesSchema);