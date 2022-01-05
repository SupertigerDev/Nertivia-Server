import {model, Schema} from 'mongoose';

interface UserBan {
  user: any,
  reason: string
}

interface Server {
  verified: boolean
  name: string
  avatar: string
  banner: string
  creator: any
  server_id: string
  created: number
  default_channel_id: string
  public: boolean
  user_bans: UserBan[]
  channel_position: string[]
  FCM_devices: any[]
}

// TODO: separate this into another model.
const userBansSchema = new Schema<UserBan>({
  user: { type: Schema.Types.ObjectId, ref: "users" },
  reason: { type: String, required: false }
});



const schema = new Schema<Server>({
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

schema.pre('save', async function(next) {
  // Date created
  this.created = Date.now();
  next();
})

export const Servers = model("servers", schema);

