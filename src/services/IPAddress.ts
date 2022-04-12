import {BannedIPs} from '../models/BannedIPs'
import { Users } from '../models/Users';

export async function checkBanned(ip: string) {
  const isBanned = await BannedIPs.exists({ip});
  return isBanned as boolean;
}

export async function updateAddress(userId: string, ip: string) {
  await Users.updateOne({id: userId}, {ip});
  return;
}