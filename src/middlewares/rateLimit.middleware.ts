import { Request, Response, NextFunction } from 'express';
import * as RateLimitCache from '../cache/rateLimit.cache';

interface Options {
  name: string, 
  expire: number, 
  requestsLimit: number, 
  useIp?: boolean, 
  nextIfInvalid?: boolean
}

export function rateLimit(opts: Options) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const {name, expire, requestsLimit, useIp, nextIfInvalid} = opts;

    const ttl = await RateLimitCache.incrementAndCheck({
      ...(useIp ? {userIp: req.userIp} : {userId: req.user?.id}),
      expire,
      name,
      requestsLimit
    })

    if (ttl === false || ttl < 0) return next();

    if (!nextIfInvalid) {
      res.status(429).json({
        message: 'Slow down!',
        ttl,
      })
      return;
    }
    if (nextIfInvalid) {
      req.rateLimited = true;
    }
    next();

  }
}