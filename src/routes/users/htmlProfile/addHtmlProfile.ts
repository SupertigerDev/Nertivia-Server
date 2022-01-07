import { NextFunction, Request, Response } from "express-serve-static-core";

import {checkHTML} from 'html-safe-checker'
import {Users} from "../../../models/Users";
import { zip } from "../../../utils/zip";

export const addHtmlProfile = async (req: Request, res: Response, next: NextFunction) => {
  const {html} = req.body;

  if (!html) {
    return res.status(403).json({error: "html key is missing from the body."})
  }
  if (typeof html !== "string") {
    return res.status(403).json({error: "html value must be type string."})
  }
  if (html.length > 5000) {
    return res.status(403).json({error: "html value length must be less than 5000 characters long."})
  }
  let jsonHtml: any;
  try {
    jsonHtml = checkHTML(html);
  } catch(err: any) {
    return res.status(403).json({error: err.message})
  }
  if (!jsonHtml) return;


  const zippedJson = zip(JSON.stringify(jsonHtml));
  await Users.updateOne({_id: req.user._id}, {$set: {htmlProfile: zippedJson}})
  res.status(201).json({message: "created!"})
};
