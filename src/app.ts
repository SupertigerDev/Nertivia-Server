import {getIOInstance} from './socket/socket'

import express from "express";
import http from "http";
// middlewares
import realIP from "./middlewares/realIP";
import cors from "./middlewares/cors";


export default function initServer() {
  const app = express();
  app.disable('x-powered-by');
  
  const server = new http.Server(app);

  const io = getIOInstance(server);
  
  app.use(express.json({limit: '10mb'}));
  app.use(express.urlencoded({ extended: true }));

  app.use(realIP);
  app.use(cors);
  app.use(function(req, res, next){
    req.io = io;
    next();
  })


  // routes
  app.use('/api', require('./routes/api'));

  return server;
}

