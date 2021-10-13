import {Schema, Document, model} from 'mongoose'
import flake from '../utils/genFlakeId'


export interface Webhook {
  id: string
  name: string
  channel: (any & Document)['_id']
  creator: (any & Document)['_id']
  server: (any & Document)['_id']
  created: number
}




const webhooksSchema = new Schema<Webhook>({
  id: {type: String},
  name: {type: String, required: true},
  channel: { type : Schema.Types.ObjectId, ref: 'channels', required: true },
  creator: { type : Schema.Types.ObjectId, ref: 'users', required: true },
  server: { type : Schema.Types.ObjectId, ref: 'servers', required: true },
  created: { type : Number},

})

webhooksSchema.pre('save', function() {
  this.id = flake.gen();
  this.created = Date.now();
})


export const WebhookModel = model<Webhook>('webhooks', webhooksSchema);