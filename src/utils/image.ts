import sharp from 'sharp';

const filetypes = /jpeg|jpg|gif|png|webp/;

// mimeType example: 'image/png'
export function isImageMime(mimeType: string) {
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