import {model, Schema} from 'mongoose';

interface CustomEmoji {
  id: string
  user: any
  name: string
  gif: boolean
}

const schema = new Schema<CustomEmoji>({
  id: {type: String, required: true},
  user: { type: Schema.Types.ObjectId, ref: 'users', required: true},
  name: { type: String, required: true},
  gif: {type: Boolean}
})


export const CustomEmojis = model('custom_emojis', schema);