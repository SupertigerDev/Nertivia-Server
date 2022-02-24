import {model, Schema} from 'mongoose';

interface Notification {
  recipient: string
  type: string
  mentioned: boolean
  channelId: string
  lastMessageID: string
  sender: any
  count: number
}


// type MESSAGE_CREATED
const schema = new Schema<Notification>({
  recipient: { type: String, required: true },
  type: { type: String, required: true },
  mentioned: {type: Boolean},
  channelId: { type: String, required: false },
  lastMessageID: {type: String, required: false },
  sender: { type: Schema.Types.ObjectId, ref: 'users', required: false},
  count: {type: Number, required: false }
})


export const Notifications = model<Notification>('notifications', schema);