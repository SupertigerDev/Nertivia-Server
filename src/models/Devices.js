const mongoose = require("mongoose");

const { Schema } = mongoose;

const devicesSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "users" },
  userId: {type: String},
  token: { type: String, unique: true },
  platform: { type: String }
});

module.exports = mongoose.model("devices", devicesSchema);
