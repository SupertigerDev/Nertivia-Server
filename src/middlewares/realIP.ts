import { Request, Response, NextFunction } from "express";
import ipRangeCheck from "ip-range-check";


export default (req: Request, res: Response, next: NextFunction) => {
  req.userIP = (req.headers["cf-connecting-ip"] ||
  req.headers["x-forwarded-for"] ||
  req.connection.remoteAddress)?.toString();
  next();
  
};
