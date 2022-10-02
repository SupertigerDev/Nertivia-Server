import fetch, { Response } from 'node-fetch';
import AbortController from "abort-controller"
import cheerio from 'cheerio';
import { getImageDimensions } from '../utils/image';

const maxSize = 10485760; // 10MB
const timeout = 5000; // 5 seconds;


// createURLEmbed("https://github.com/supertiger1234").then(res => {
//   console.log(res[0], res[1])
// });


function fetchUrl(url: string): Promise<[null | {buffer: Buffer, res: Response}, null | string]> {
  return new Promise(async resolve => {
    const abortController = new AbortController();

    const timeoutId = setTimeout(() => {
      abortController.abort();
      resolve([null, "Timeout!"]);
    }, timeout);

    const res = await fetch(url, {signal: abortController.signal, headers: { 'User-Agent': 'Mozilla/5.0 NertiviaBot' }}).catch(() => {});
    if (!res) {
      clearInterval(timeoutId);
      resolve([null, "Invalid URL"]);
      return;
    }
    const isImage = res.headers.get("content-type")?.startsWith("image");
    const isHtml = res.headers.get("content-type")?.startsWith("text/html");

    if (!isHtml && !isImage) {
      clearInterval(timeoutId);
      resolve([null, "Is not an image or a html page."]);
      return;
    }

    let size = parseInt(res.headers.get("content-length") || "0");
    
    if (size > maxSize) {
      clearInterval(timeoutId);
      resolve([null, "Max size limit"]);
      return;
    }

    size = 0;
    res.body.on("data", data => {
      size += data.length;
      if (size > maxSize) {
        clearInterval(timeoutId);
        return [null, "Max size limit"];
      }  
    })
    const buffer = await res.buffer().catch(() => {});
    if (!buffer) return;
    resolve([{buffer, res}, null]);
  });
}

export async function createURLEmbed(url: string) {

  const [result, error] = await fetchUrl(url);
  if (error || !result) return [null, error];

  const {res, buffer} = result;
  
  const isImage = res.headers.get("content-type")?.startsWith("image");

  if (isImage) {
    const [imageData, error] = await getImageData(url, buffer);
    if (error) return [null, error];
    return [{image: imageData}, null]
  }
  const tenor = getTenorTag(buffer, url);
  if (tenor) return [tenor, null];

  const OGTags = getOGTags(buffer);
  if (!OGTags) return [null, null];
  let embed = await tagsToEmbed(OGTags);


  return [embed, null];


}

async function tagsToEmbed(OGTags: any) {
  const image_url = OGTags.image;
  if (!image_url) return OGTags;
  delete OGTags.image;
 
  const [result, fetchError] = await fetchUrl(image_url)
  if (fetchError || !result) return OGTags;

  const {buffer} = result;
  const [imageData, imageError] = await getImageData(image_url, buffer);
  if (imageError || !imageData) return OGTags

  const embed = {...OGTags, image: imageData}

  return embed;
}

function getTenorTag(buffer: Buffer, url: string) {
  if (!url.startsWith("https://tenor.com")) return null;
  const tenorEmbed = getOGTags(buffer, ["video", "video:width", "video:height"]);
  return {
    type: "tenor",
    url: tenorEmbed.video,
    width: tenorEmbed["video:width"],
    height: tenorEmbed["video:height"]
  }
}


async function getImageData(url: string, buffer: Buffer) {
  const dimensions = await getImageDimensions(buffer);
  if (!dimensions) return [null, "Invalid Image."];
  const data = {
    url: url,
    dimensions
  }
  return [data, null]
}


const allowedTags = ["type", "url", "title", "image", "description", "site_name", ""]
function getOGTags(buffer: Buffer, allowed = allowedTags) {
  // get og tags  
  const parseHTML = cheerio.load(buffer);

  const metaTags = parseHTML('meta');
  let metaTagsArray = metaTags.toArray();

  const embed: any = {};
  for (let i = 0; i < metaTagsArray.length; i++) {
    const element = metaTagsArray[i];
    const property = element.attribs.property;
    const content = element.attribs.content;
    if (!property?.startsWith("og:")) continue;
    if (content.length > 2000) continue;
    const key = property.substring(3);

    if (!allowed.includes(key)) continue;
    embed[key] = content;
  }
  if (!Object.values(embed).length) return null;
  return embed;
}