import { NextFunction, Request, Response } from "express";
import {decodeToken} from '../utils/JWT';
import * as UserCache from '../cache/User.cache';
import * as IPAddress from '../services/IPAddress';
interface Options {
  allowBot?: boolean, 
  // Get rid of this dangerous act asap.
  allowInvalid?: boolean,
  allowNonTerms?: boolean
}

const defaultOptions: Options = {
  allowBot: false, 
  allowInvalid: false,
  allowNonTerms: false
}

export function authenticate (_opts: Options) {
  const opts = {...defaultOptions, ..._opts};
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = process.env.JWT_HEADER + req.headers.authorization;
    const tokenData = await decodeToken(token).catch(() => {});
    if (!tokenData) {
      if (opts.allowInvalid) return next();
      return res.status(401).json({message: "Invalid token."});
    }
    // Checks in the cache and then the database.
    const [user, error] = await UserCache.getUser(tokenData.id)
    if (error || !user) {
      return res.status(404).json({message: error});
    }
    const currentPasswordVersion = user.passwordVersion || 0;
    if (tokenData.passwordVersion !== currentPasswordVersion) {
      return res.status(401).json({message: "Invalid Token."});
    }

    const isBanned = await checkIPBanned(user.id, req.userIP, user.ip);
    if (isBanned) {
      return res.status(401).json({message: "IP is banned."});
    }
    if (user.bot && !opts.allowBot) {
      return res.status(403).json({message: "Bots are not allowed to access this."})
    }
    if (!user.bot && !opts.allowNonTerms && !user.readTerms) {
      return res.status(401).send({
        message: "You must accept the updated privacy policy and the TOS before continuing."
      });
    }
    req.user = user;
    next();
  }
}

// currentIP: latest IP.
// savedIP: ip in the database.
async function checkIPBanned(userId: string, currentIP: string, savedIP?: string) {
  if (currentIP === savedIP) return false;
  const isBanned = await IPAddress.checkBanned(currentIP);
  if (isBanned) return true;
  await IPAddress.updateAddress(userId, currentIP);
  await UserCache.updateUser(userId, {ip: currentIP});
  return false;
}