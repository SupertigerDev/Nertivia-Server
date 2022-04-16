import sharp from 'sharp';

const filetypes = /jpeg|jpg|gif|png|webp/;



// return mimetype from a base64 string
// returns 'image/png' or null;
export function base64MimeType(base64: string) {
  let result = null;

  if (typeof base64 !== 'string') {
    return null;
  }
  const mime = base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    result = mime[1];
  }

  return result;
}

// mimeType example: 'image/png'
export function isImageMime(mimeType: string | undefined | null) {
  if (!mimeType) return false;
  const filetypes = /jpeg|jpg|gif|png|webp/;
  const isImage = filetypes.test(mimeType);
  return isImage;
}


export interface ImageDimension {
  width: number;
  height: number;
}

// input can be a path or a buffer.
export async function getImageDimensions(input: string | Buffer): Promise<ImageDimension | null> {
  const metadata = await sharp(input)?.metadata();
  if (!metadata) return null;
  if (!metadata.width || !metadata.height) return null;
  return {width: metadata.width, height: metadata.height};
}