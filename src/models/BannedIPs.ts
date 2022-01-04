import {Schema, model} from 'mongoose';

export interface BannedIP {
  ip: string
  expireAt: number
}

const schema = new Schema<BannedIP>({
  ip: {type: String, unique: true},
  expireAt: {
    type: Date,
    default: Date.now,
    index: {expires: 398999 } // 4.6 days
  },
});


export const BannedIPs = model<BannedIP>('banned_ips', schema);


