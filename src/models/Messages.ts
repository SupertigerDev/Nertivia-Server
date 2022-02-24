import {Schema, Document, model} from 'mongoose'
import flake from '../utils/genFlakeId'
import { MessageQuote } from './MessageQuotes'


interface Embed {
  title: string,
  type: string,
  url: string,
  image: any,
  site_name: string,
  description: string,
}
export interface Message {
  channelId: string
  messageID: string
  files?: any[]
  message: string
  creator: any
  created: number
  embed?: Embed
  buttons?: any[]
  htmlEmbed?: string
  mentions?: any[]
  quotes?: (MessageQuote & Document)['_id']
  timeEdited?: number
  color?: string
  type: MessageType
}

enum MessageType {
  MESSAGE = 0,
  JOIN_MESSAGE = 1,
  LEAVE_MESSAGE = 2,
  KICK_MESSAGE = 3,
  BAN_MESSAGE = 4
}

const embedSchema = new Schema<Embed>({
  title: String,
  type: String,
  url: String,
  image: Object,
  site_name: String,
  description: String,
})


const messagesSchema = new Schema<Message>({
  channelId: { type: String, required: true },
  messageID: { type: String, required: true, unique: true },
  files: { type: Array, required: false },
  message: { type: String, required: false  },
  creator: { type: Schema.Types.ObjectId, ref: 'users' },
  created: { type: Number },
  embed: {type: embedSchema},
  buttons: {type: Array},
  htmlEmbed: {type: String},
  mentions: [{ type : Schema.Types.ObjectId, ref: 'users' }],
  quotes: [{ type : Schema.Types.ObjectId, ref: 'message_quotes' }],
  timeEdited: { type: Number, required: false},
  color: {type: String, required: false},
  type: {type: Number, default: 0, enum: [
    0, // Message
    1, // Join message
    2, // leave message,
    3, // kick message,
    4, // ban message
  ]}
})

messagesSchema.pre('save', function() {
  this.messageID = flake.gen();
  this.created = Date.now();
})


export const Messages = model<Message>('messages', messagesSchema);