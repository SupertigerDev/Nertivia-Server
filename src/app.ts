import {getIOInstance} from './socket/instance'

const vhost = require('vhost');
import config from "./config";
import express from "express";
import http from "http";

// middlewares
import cloudflareCheck from "./middlewares/cloudFlareCheck";
import redisSession from './middlewares/redisSession'
import cors from "./middlewares/cors";
import bodyParser from 'body-parser';

export default function initServer() {
  const app = express();
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

  if (config.domain) {
    app.use(vhost('musica.' + config.domain, express.static('public/musica')))
    app.use(vhost('reddit.' + config.domain, express.static('public/reddit')))

    app.use(vhost('nertivia.' + config.domain, require('./routes/chat')))
    app.use(vhost('nertiviabeta.' + config.domain, require('./routes/chatBeta')))
  } else {
    app.use('/musica', express.static('public/musica'))
    app.use('/reddit', express.static('public/reddit'))

    app.use('/nertivia', require('./routes/chat'))
    app.use('/nertiviabeta', require('./routes/chatBeta'))
  }

  app.use('/', express.static('public/supertiger/'))


  return server;
}