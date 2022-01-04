import {model, Schema} from 'mongoose';

interface Device {
  user: any
  userId: string,
  token: string,
  platform: string,
}


const schema = new Schema<Device>({
  user: { type: Schema.Types.ObjectId, ref: "users" },
  userId: {type: String},
  token: { type: String, unique: true },
  platform: { type: String }
});

export const Devices = model<Device>("devices", schema);
