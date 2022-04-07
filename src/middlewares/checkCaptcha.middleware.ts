import { NextFunction, Request, Response } from "express";
import fetch from "node-fetch";

interface Options {
  // When set to false, captcha will be forced.
  captchaOnRateLimit: boolean;
}

export function checkCaptcha (opts: Options) {
  return async function (req: Request, res: Response, next: NextFunction) {

    const token = req.body.token;

    if (process.env.DEV_MODE === "true") return next();
    if (opts.captchaOnRateLimit && !req.rateLimited) return next();

    if (!token?.trim()) {
      return res.status(400).json({ status: false, errors: [{ msg: "Captcha token is required!", param: "reCaptcha", code: 1 }] });
    }

    const verifyUrl = "https://hcaptcha.com/siteverify"
    const secret = process.env.CAPTCHA_KEY;
    const siteKey = process.env.CAPTCHA_SITE_KEY as string;

    const url = new URL(verifyUrl);
    url.searchParams.append("secret", secret);
    url.searchParams.append("response", token);
    url.searchParams.append("sitekey", siteKey);
    url.searchParams.append("remoteip", req.userIp);

    fetch(url, {method: 'post'}) 
      .then(res => res.json())
      .then(json => {
        if (json.success === false) {
          throw Error("Invalid Token")
        }
        next();
      })
      .catch(() => {
        res.status(403).json({ status: false, errors: [{ msg: "Invalid Captcha token!", param: "reCaptcha" }] });
      })
  }
}