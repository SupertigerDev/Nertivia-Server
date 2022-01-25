import {model, Schema} from 'mongoose';

export interface MessageReaction {
  messageID: string,
  emojiID: string,
  unicode: string,
  gif: boolean,
  reactedBy: string[]
}


const schema = new Schema<MessageReaction>({
  messageID: String,
  emojiID: String,
  unicode: String,
  gif: Boolean,
  reactedBy: [{ type : Schema.Types.ObjectId, ref: 'users' }],
})





export const MessageReactions = model<MessageReaction>('message_reactions', schema);