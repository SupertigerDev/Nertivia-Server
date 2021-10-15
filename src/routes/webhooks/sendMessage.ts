import { NextFunction, Request, Response } from "express-serve-static-core";

interface Body {
  name: string,
  message: string,
}

export async function sendMessage (req: Request, res: Response, next: NextFunction) {
  console.log(req.session?.webhook)
  const body: Body = req.body;

  console.log(body)



}