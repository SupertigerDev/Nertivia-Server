const linkifyIt = require('linkify-it')();
const request = require('request')
const cheerio = require('cheerio')
const Messages = require('./../models/messages');
const sharp = require('sharp');

const URL = require('url').URL
module.exports = (req, res, next) => {
  if (!req.message_status) next();
  const message = req.body.message;
  const message_id = req.message_id
  if (!message) return;

  const urls = linkifyIt.match(message)
  
  if (!urls) return;

  let firstURL = urls[0].url


  request(firstURL, async (error, response, responseHtml) => {
    if (error) return;
    const resObj = {
      embed: {},
      channelID: req.channel.channelID,
      messageID: message_id
    }
    const $ = cheerio.load(responseHtml)


    resObj.embed.title = $('meta[property="og:title"]').attr('content')
    resObj.embed.type = $('meta[property="og:type"]').attr('content')
    resObj.embed.url = $('meta[property="og:url"]').attr('content')
    resObj.embed.image = $('meta[property="og:image"]').attr('content')
    resObj.embed.site_name = $('meta[property="og:site_name"]').attr('content')
    resObj.embed.description = $('meta[property="og:description"]').attr('content')

    resObj.embed = JSON.parse(JSON.stringify(resObj.embed)); 

    const keys = Object.keys(resObj.embed);
    if (!keys.length || keys.length === 1) return;

    if (!resObj.embed.url){
      resObj.embed.url = firstURL;
    }

    // Get image dimensions.   
    if (resObj.embed.image){
      const {ok, result} = await getMetadata(resObj.embed.image)
      if (ok == false) {
        delete resObj.embed.image;
      } else {
        const newObj = {
          url: resObj.embed.image,
          dimensions: {
            height: result.height,
            width: result.width
          }
        }
        resObj.embed.image = newObj;
      }
    }

      


    await Messages.updateOne({messageID: resObj.messageID}, resObj);

    const io = req.io;

    if (req.channel.server) {
      io.in('server:' + req.channel.server.server_id).emit('update_message', resObj)
    } else {
      io.in(req.channel.recipients[0].uniqueID).emit('update_message', resObj)
      io.in(req.user.uniqueID).emit('update_message', resObj)
    }

  })
  
}


function getMetadata(url) {
  return new Promise(resolve => {
    const requestSettings = {
      url,
      method: "GET",
      encoding: null
    };
    const reqImages = request(requestSettings)
      .on('error', _ => resolve({ok: false}))
      .on('response', resp => {
        if (resp.statusCode !== 200) {
          reqImages.abort();
          return resolve({ok: false});
        }
      })
      .on("data", async (chunk) => {
        reqImages.abort();
        try {
          resolve({ok: true, result: await sharp(chunk).metadata()})
        } catch {
          resolve({ok: false})
        }
      })
  })
}