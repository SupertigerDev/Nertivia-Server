import {getIOInstance} from './socket/instance'

import express from "express";
import http from "http";
// middlewares
import realIP from "./middlewares/realIP";
import redisSession from './middlewares/redisSession'
import cors from "./middlewares/cors";
import bodyParser from 'body-parser';


export default function initServer() {
  const app = express();
  app.disable('x-powered-by');
  
  const server = new http.Server(app);

  const io = getIOInstance(server);
  
  //redis://[USER]:[PASSWORD]@[SERVICE-IP]:[PORT]
  // io.adapter(redisAdapter({
  //   host: process.env.REDIS_HOST,
  //   port: process.env.REDIS_PORT,
  //   auth_pass: process.env.REDIS_PASS
  // }));

  // middlewares
  app.use(bodyParser.json({limit: '10mb'}));
  app.use(realIP);
  app.use(cors);
  app.use(function(req, res, next){
    req.io = io;
    next();
  })
  app.use(redisSession);


  // routes
  app.use('/api', require('./routes/api'));

  return server;
}

