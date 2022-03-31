import { Users } from "../../models/Users";
import { SERVER_POSITION_UPDATED } from "../../ServerEventNames";
import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

export async function serverPositionUpdate(Router: Router) {
  Router.route("/server_position")
  .put(authenticate(), route)
}

export async function route(req: Request, res: Response) {

  const io = req.io;
  const { server_position } = req.body;

  // check if there are more than 200 entries
  if (server_position.length >= 200) {
    return res.status(403).json({
      message: 'Limit reached (max: 200)',
    })
  }

  for (let index = 0; index < server_position.length; index++) {
    const element = server_position[index];
    if (element.length >= 50 || typeof element !== "string") {
      return res.status(403).json({
        message: 'Invalid server_id format.',
      })
    } 
  }

  try {
    const update = await Users.updateOne(
      { _id: req.user._id },
      {'settings.server_position': server_position},
      {upsert: true},
      );
      res.json({
        server_position
      });
      io.in(req.user.id).emit(SERVER_POSITION_UPDATED, {server_position} );
      return;
  } catch(e) {
    return res.status(403).json({
      message: 'Something went wrong, try again later.',
    });
  }
};
