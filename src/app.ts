import {getIOInstance} from './socket/instance'

const vhost = require('vhost');
import express from "express";
import http from "http";

// middlewares
import cloudflareCheck from "./middlewares/cloudFlareCheck";
import redisSession from './middlewares/redisSession'
import cors from "./middlewares/cors";
import bodyParser from 'body-parser';

export default function initServer() {
  const app = express();
  app.disable('x-powered-by');
  
  const server = new http.Server(app);

  const io = getIOInstance(server);

  // middlewares
  app.use(bodyParser.json({limit: '10mb'}));
  app.use(cloudflareCheck);
  app.use(cors);
  app.use(function(req, res, next){
    req.io = io;
    next();
  })
  app.use(redisSession);


  // routes
  app.use('/api', require('./routes/api'));

  if (process.env.DOMAIN) {
    app.use(vhost(process.env.DOMAIN, require('./routes/chat')))
    app.use(vhost('beta.' + process.env.DOMAIN, require('./routes/chatBeta')))
    app.use(vhost('supertiger.' + process.env.DOMAIN, express.static('public/supertiger/')))
  } else {
    app.use('/nertivia', require('./routes/chat'))
    app.use('/nertiviabeta', require('./routes/chatBeta'))
  }



  return server;
}
