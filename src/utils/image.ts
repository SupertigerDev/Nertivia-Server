import sharp from 'sharp';
// input can be a path or a buffer.
export async function getImageDimensions(input: string | Buffer) {
  const metadata = await sharp(input)?.metadata();
  if (!metadata) return null;
  return {width: metadata.width, height: metadata.height};
}