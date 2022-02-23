import { NextFunction, Response, Request } from "express";

//check if user is in the server.
export function serverMemberVerify(req: Request, res: Response, next: NextFunction) {
  // TODO: replace :server_id with serverId.
  const serverId = req.params.server_id;


  
};
