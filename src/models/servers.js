const mongoose = require("mongoose");
const { Schema } = mongoose;

const userBansSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "users" },
  reason: { type: String, required: false }
});

const serversSchema = new Schema({
  verified: {type: Boolean, select: false},
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
  channel_position: [{type: String, required: false, select: false}],
  FCM_devices: { type: [{ type: Schema.Types.ObjectId, ref: 'devices' }], select: false },
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

const Servers = mongoose.model("servers", serversSchema);

module.exports = Servers;
