import {Request, Response} from 'express';
import { sendRequest } from "../../../services/Friends";


export async function friendRequest(req: Request, res: Response) {
  const {username, tag} = req.body;
  sendRequest(req.user.id, username, tag)
    .then(response => {
      res.status(200).json({message: response.message});
    })
    .catch(err => {
      res.status(err.status || 500).json({ errors: [{param: "all", msg: err.message}]});
    })

}