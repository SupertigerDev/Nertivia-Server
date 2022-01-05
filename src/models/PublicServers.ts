import {Schema, model} from 'mongoose';

interface PublicServer {
  id: string
  creator: any
  server: any
  description: string
  created: number;
}


const schema = new Schema<PublicServer>({
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  id: {type: String},
  description: {type: String},
  created: {type: Number, default: 0},
  creator: {type: Schema.Types.ObjectId, ref: 'users'},
});



schema.pre('save', async function(next) {
  // Date created
  this.created = Date.now();
  next();
})



export const PublicServers = model<PublicServer>('public_servers', schema);