const mongoose = require("mongoose");
const beautifyUnique = require("mongoose-beautiful-unique-validation");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const FlakeId = require("flakeid");
const flake = new FlakeId();

const userBansSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "users" },
  reason: { type: String, required: false }
});

const serversSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  avatar: { type: String, default: null},
  banner: { type: String },
  creator: { type: Schema.Types.ObjectId, ref: "users" },
  server_id: {
    type: String,
    unique: true
  },
  created: {
    type: Number
  },
  default_channel_id: { type: String },
  public: { type: Boolean },
  user_bans: { type: [userBansSchema], select: false },
  channel_position: [{type: String, required: false, select: false}]
});

serversSchema.pre("save", async function(next) {
  try {
    // Date created
    this.created = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

serversSchema.plugin(beautifyUnique);
const Servers = mongoose.model("servers", serversSchema);

module.exports = Servers;
