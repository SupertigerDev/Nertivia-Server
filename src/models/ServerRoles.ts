import {model, Schema} from 'mongoose';

interface ServerRole {
  name: string;
  id: string
  color: boolean;
  hideRole: boolean;
  permissions: number
  server: any
  server_id: string
  default: boolean,
  bot: any
  deletable: boolean
  order: number
}

const schema = new Schema<ServerRole>({
  name: {type: String, default: 'New Role'},
  id: {type: String},
  color: {type: String},
  hideRole: {type: Boolean},
  permissions:{type: Number, default: 0},
  server: {type: Schema.Types.ObjectId, ref: 'servers'},
  server_id: {type: String},
  default: {type: Boolean, default: false}, // prevents them from changing certain things eg: change name of the role.
  bot: {type: Schema.Types.ObjectId, ref: 'user'},
  deletable: {type: Boolean, default: true},
  order: {type: Number},
});



export const ServerRoles = model<ServerRole>('server_roles', schema);