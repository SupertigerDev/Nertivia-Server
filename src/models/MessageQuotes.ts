import {Schema, model, Types} from 'mongoose'



export interface MessageQuote {
  message: string,
  messageID: string,
  quotedChannel: any
  creator?: Types.ObjectId[]
}


const schema = new Schema<MessageQuote>({
  message: String,
  messageID: String,
  quotedChannel: { type : Schema.Types.ObjectId, ref: 'channels' },
  creator: { type : Schema.Types.ObjectId, ref: 'users' }
});


export const MessageQuotes = model<MessageQuote>('message_quotes', schema);

