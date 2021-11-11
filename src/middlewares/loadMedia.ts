import { NextFunction, Request, Response } from "express";
import sharp from "sharp";

import fetch from "node-fetch";
export default async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params["0"].split("/")[0];

  const encode = encodeURIComponent(
    `https://drive.google.com/uc?export=view&id=${id}`
  );
  const url = `https://proxi.bree.workers.dev/cdn/${encode}`;
  const type = req.query.type;
  fetch(url).then(async (fetchResponse) => {
    if (fetchResponse.status !== 200) return res.status(404).end();
    const buffer = await fetchResponse.buffer();
    res.set("Cache-Control", "public, max-age=31536000");
    if (type !== "webp") {
      res.set(
        "content-type",
        fetchResponse.headers.get("content-type") || "image/png"
      );
      res.end(buffer);
      return;
    }
    res.set("content-type", "image/webp");
    res.type("image/webp");
    await sharp(buffer)
      .webp()
      .toBuffer()
      .then((data) => {
        res.end(data);
      })
  }).catch(() => {
    res.status(404).end();
  });
};