
import {Schema, model} from 'mongoose';


interface ServerMember {
  member: any
  server: any
  server_id: string
  type: string
  roles: any[]
  muted: number
  muted_channels: any[]
  last_seen_channels: any
}

const schema = new Schema<ServerMember>({

  member: { type: Schema.Types.ObjectId, ref: 'users'},
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String},
  type: {type: String, default: "MEMBER", enum: ['MEMBER','OWNER', 'ADMIN', 'BOT']},
  roles: [{type: String, required: false, select: false}],
  muted: {type: Number, select: false, enum: [0, 1, 2]}, // enable, sound, mute all
  muted_channels: [{type: String, required: false, select: false}],
  last_seen_channels: {type: Object, select: false}

});

schema.index({member: 1, server: 1}, {unique: true});

export const ServerMembers = model<ServerMember>('server_members', schema);