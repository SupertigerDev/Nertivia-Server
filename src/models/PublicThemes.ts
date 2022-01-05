import {model, Schema} from 'mongoose';

interface PublicTheme {
  id: string
  css: string
  updatedCss: string, 
  description: string
  created: number
  approved: boolean
  theme: any
  screenshot: string
  creator: any
  likes: any[]
  compatible_client_version: string
}

const schema = new Schema<PublicTheme>({
  id: {type: String, required: true},
  css: {type: String, required: true},
  updatedCss: {type: String, required: false}, // When the creator updates their css, it will be added here for me to approve them.
  description: {type: String},
  created: {type: Number, default: 0},
  approved: {type: Boolean, default: false},
  theme: { type: Schema.Types.ObjectId, ref: 'themes' },
  screenshot: {type: String},
  creator: { type: Schema.Types.ObjectId, ref: 'users' },
  likes: {type: [Schema.Types.ObjectId], ref: 'users'},
  compatible_client_version: {type: String}
})


schema.pre('save', async function(next) {
  // Date created
  this.created = Date.now();
  next();
})


export const PublicThemes = model<PublicTheme>('public_themes', schema);