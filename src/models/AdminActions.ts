import {model, Schema} from 'mongoose';


export interface AdminAction {
  action: string
  bannedIP: string,
  reason: string,
  admin: any,
  user: any,
  date: number,
  expireAt: number
}

const schema = new Schema<AdminAction>({
  action: {type: String, enum: [
    "SUSPEND_USER",
    "UNSUSPEND_USER",
    "BAN_IP",
    "UNBAN_IP",
    "APPROVE_THEME"
  ]},
  bannedIP: String,
  reason: String,
  admin: { type: Schema.Types.ObjectId, ref: 'users'},
  user: { type: Schema.Types.ObjectId, ref: 'users'},
  date: Number,
  expireAt: {
    type: Date,
    default: Date.now,
    index: {expires: 398999 } // 4.6 days
  },
});


export const AdminActions = model<AdminAction>('admin_actions', schema);
