import { Request, Response, NextFunction } from "express";
import connectRedis from "connect-redis";
import session from "express-session";
import JWT from 'jsonwebtoken';
import * as redis from '../common/redis'
import { RequestHandler } from "express";

const RedisStore = connectRedis(session);


process.on('warning', (warning) => {
  console.warn(warning.name);    // Print the warning name
  console.warn(warning.message); // Print the warning message
  console.warn(warning.stack);   // Print the stack trace
});

let sessionInstance:RequestHandler | null = null;

function getSessionInstance() {
  if (sessionInstance !== null) return sessionInstance;
  sessionInstance = session({
    secret: process.env.SESSION_SECRET,
    store: new RedisStore({
      client: redis.client,
      ttl: 600
    }),
    genid: req => {
      const token = process.env.JWT_HEADER + req.headers.authorization;
      try {
        // will contain user id
        const decryptedToken = JWT.verify(token, process.env.JWT_SECRET);
        return decryptedToken.toString().split("-")[0];
      } catch (err) {
        return "notLoggedIn";
      }
    },
    saveUninitialized: false,
    resave: false,
  })
  return sessionInstance;
}

export default (req: Request, res: Response, next: NextFunction) => {
  getSessionInstance()(req, res, next)
  
};
