import {model, Schema} from 'mongoose'


interface ServerInvite {
  server: any
  creator: any
  invite_code: string
  uses: number
  custom: boolean
}

const schema = new Schema<ServerInvite>({
  server: { type: Schema.Types.ObjectId, ref: 'servers', required: true, select: false },
  creator: { type: Schema.Types.ObjectId, ref: 'users', required: true, select: false },
  invite_code: { type: String, unique: true, required: true },
  uses: { type: Number, default: 0, select: false},
  custom: {type: Boolean}
})



export const ServerInvites = model<ServerInvite>('server_invite', schema);


