import {Request, Response, NextFunction} from 'express'
import request from 'request';
import sharp from 'sharp';

export default async (req:Request, res:Response, next:NextFunction) => {
  const id = req.params["0"].split("/")[0];
  const type = req.query.type;

  if (id === "default" || id === "default.png") return next()
  const url = `https://avruqwirqo.cloudimg.io/v7/https://drive.google.com/uc?export=view&id=${id}`;
  const requestSettings = {
    url,
    method: "GET",
    encoding: null
  };

  request(requestSettings, (err, resp, buffer) => {
      if (resp && resp.statusCode !== 200) return next()
      if (err) return next()
      res.set('Cache-Control', 'public, max-age=31536000');
       if (type && type === "webp") { 
         res.type('image/webp')
         sharp(buffer)
           .webp()
           .toBuffer()
           .then(data => {
             res.end(data);
           })
           .catch(err => {
             return res.status(404).end();
           });
       } else {
         res.end(buffer);
       }
     })


};