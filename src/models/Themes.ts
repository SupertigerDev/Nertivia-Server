import { Schema, model } from 'mongoose';

interface Theme {
  id: string
  name: string
  css: string
  client_version: string
  creator: any
}

const schema = new Schema<Theme>({
  id: {type: String, required: true},
  name: {type: String, required: true},
  css: {type: String, required: true},
  client_version: {type: String},
  creator: { type: Schema.Types.ObjectId, ref: 'users' },
})



export const Themes = model<Theme>('themes', schema);