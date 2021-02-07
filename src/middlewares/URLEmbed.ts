import {Response, Request, NextFunction} from 'express'
import AbortController from "abort-controller"
import cheerio from 'cheerio';

const Messages = require('./../models/messages');
import sharp from 'sharp';
import fetch from 'node-fetch';

interface RequestCustom extends Request {
  message_status?: boolean;
  message_id: string;
  channel: any;
  user: any
}

interface Embed {
  title?: string,
  type?: string,
  url?: string,
  image?: string
  site_name?: string,
  description?: string,
}

//const imageFormatArr = ["png", "jpg", "jpeg", "webp", "gif"]
const urlRegex = new RegExp(
  "(^|[ \t\r\n])((http|https):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))");

module.exports = async (req:RequestCustom, res: Response, next: NextFunction) => {
  const message: string = req.body.message || req.uploadFile.message;
  const message_id = req.message_id
  if (!message) return;


  const url = message.match(urlRegex)?.[0].trim();
  if (!url?.[0]) return;


  let resObj: any = {}
  const OGTagResult = await getOGTags(url)
  if (!OGTagResult.ok) return;
  // if url is an image 
  if (OGTagResult.type === "img") {
    try {
      const meta = await getImageMetadata(url);
      resObj = {
        image: {
          url: url,
          dimensions: {
            height:meta.height,
            width: meta.width
          }
        }
      }
    } catch {
      return;
    }
  } else if (!OGTagResult.result) return
  resObj = OGTagResult.result;
  if (OGTagResult.result?.image) {
    try {
      const meta = await getImageMetadata(OGTagResult.result.image);
      resObj = {...resObj, image: {
        url: OGTagResult.result.image,
        dimensions: {
          height:meta.height,
          width: meta.width
        }
      }}
    } catch {
      delete OGTagResult.result.image;
      resObj = OGTagResult;
    }
  }
  await Messages.updateOne({messageID: message_id}, {embed: resObj});

  const io:any = req.io;

  const emitData = {
    embed: resObj, 
    channelID: req.channel.channelID,
    messageID: message_id
  }
  if (req.channel.server) {
    io.in('server:' + req.channel.server.server_id).emit('update_message', {...emitData, replace: false})
  } else {
    io.in(req.channel.recipients[0].uniqueID).emit('update_message', {...emitData, replace: false})
    io.in(req.user.uniqueID).emit('update_message', {...emitData, replace: false})
  }
}


function getOGTags(url: string) {
  return new Promise<{ok: boolean, result?: Embed, type?: string}> (async resolve => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return resolve({ok: false})
      }
      if (res.headers.get("content-type")?.startsWith("image")) {
        return resolve({ok: true, type: "img"})
      }
      const embed:Embed = {};
      const html = await res.text();
      const parseHTML = cheerio.load(html);
      addIfExists(embed, "title", parseHTML('meta[property="og:title"]').attr('content'))
      addIfExists(embed, "type", parseHTML('meta[property="og:type"]').attr('content'))
      addIfExists(embed, "url", parseHTML('meta[property="og:url"]').attr('content'))
      addIfExists(embed, "image", parseHTML('meta[property="og:image"]').attr('content'))
      addIfExists(embed, "site_name", parseHTML('meta[property="og:site_name"]').attr('content'))
      addIfExists(embed, "description", parseHTML('meta[property="og:description"]').attr('content'))
      const keys = Object.keys(embed);
      if (!keys.length || keys.length === 1) return resolve({ok: false})
      if (!embed.url){
        embed.url = url;
      }
      return resolve({ok: true, result: embed});
    } catch {
      return resolve({ok: false})
    }
  })
}

function addIfExists(embed: Embed, key:keyof Embed , value?:string) {
  if (!value) return;
  if (value.length >= 2000) return;
  embed[key] = value;
}



function getImageMetadata(url: string) {
  return new Promise<sharp.Metadata> ((resolve, reject) => {
    const controller = new AbortController();
    const { signal } = controller;

    fetch(url, { signal })
      .then(res => {
        if(!res.ok) {
          controller.abort()
          reject("Response was not OK")
        }

        res.body.once('data', chunk => {
          sharp(chunk).metadata()
            .then(meta => {
              controller.abort()
              resolve(meta)
            })
            .catch(err => {
              // ignore
            })
        })

        res.buffer()
          .then(buf => sharp(buf).metadata())
          .then(meta => resolve(meta))
          .catch(err => reject(err))
      })
  })
}
