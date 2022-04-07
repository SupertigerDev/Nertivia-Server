import {Request, Response} from 'express';
import { acceptRequest } from "../../../services/Friends";


export async function friendAccept(req: Request, res: Response) {
  const friendId = req.body.id;

  acceptRequest(req.user.id, friendId)
    .then(response => {
      res.status(200).json({message: response.message});
    })
    .catch(err => {
      res.status(err.status || 500).json({ errors: [{param: "all", msg: err.message}]});
    })
}