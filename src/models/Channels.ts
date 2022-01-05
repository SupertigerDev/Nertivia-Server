import {Schema, model} from 'mongoose';


// TODO: replace this with bitwise permissions
interface Permissions {
  send_message: boolean
}
interface Channel {
  name: string,
  channelID: string
  visibility: boolean
  creator: any
  recipients: any[]
  hide: boolean
  server: any
  server_id: any
  icon: string,
  lastMessaged: number
  rateLimit: number,
  status: number,
  permissions: Permissions
}
const permissionsSchema = new Schema<Permissions>({
  send_message: Boolean
})

const schema = new Schema<Channel>({
  name: {type: String},
  channelID: { type: String, required: true },
  visibility: {type: Boolean},
  creator: { type: Schema.Types.ObjectId, ref: 'users'},
  recipients: [{type: Schema.Types.ObjectId, ref: 'users'}],
  hide: {type: Boolean, select: false, required: false}, // only used for recent dms.
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String, required: false},
  icon: {type: String, required: false},
  lastMessaged: {type: Number},
  // in seconds
  rateLimit: {type: Number, required: false},
  status: {
    type: Number,
    default: 0,
    enums: [
        0, //'not blocked',
        1, //'blocked',
    ]
  },
  permissions: {type: permissionsSchema, select: true,}
})


export const Channels = model<Channel>('channels', schema);