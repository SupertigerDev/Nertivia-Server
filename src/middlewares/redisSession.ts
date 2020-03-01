import { Request, Response, NextFunction } from "express";
import connectRedis from "connect-redis";
import session from "express-session";
import config from "../config";
import JWT from 'jsonwebtoken';
import {getRedisInstance, redisInstanceExists} from '../redis/instance'
import { RequestHandler } from "express-serve-static-core";

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
    secret: config.sessionSecret,
    store: new RedisStore({
      client: getRedisInstance(),
      ttl: 600
    }),
    genid: req => {
      const token = config.jwtHeader + req.headers.authorization;
      try {
        // will contain uniqueID
        let decryptedToken = JWT.verify(token, config.jwtSecret);
        return decryptedToken.toString();
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
