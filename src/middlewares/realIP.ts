import { Request, Response, NextFunction } from "express";


export default (req: Request, res: Response, next: NextFunction) => {
  req.userIp = (req.headers["cf-connecting-ip"] ||
  req.headers["x-forwarded-for"] ||
  req.connection.remoteAddress)?.toString() as string;
  next();
  
};
