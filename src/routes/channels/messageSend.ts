import { Request, Response, Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import channelRateLimit from '../../middlewares/channelRateLimit';
import { channelVerification } from '../../middlewares/ChannelVerification';
import checkRolePermissions from '../../middlewares/checkRolePermissions';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import rateLimit from '../../middlewares/rateLimit';
import messagePolicy from '../../policies/messagePolicies';
import serverChannelPermissions from '../../middlewares/serverChannelPermissions'
import permissions from '../../utils/rolePermConstants';
import connectBusboy from 'connect-busboy';
import { Log } from '../../Log';
import { Readable } from 'form-data';

export const messageSend = (Router: Router) => {
  Router.route("/:channelId/messages/").post(
    authenticate(true),
    messagePolicy.post,
    rateLimit({name: 'message_send', expire: 20, requestsLimit: 15 }),
    channelVerification,
    channelRateLimit,
    disAllowBlockedUser,
    serverChannelPermissions('send_message', true),
    checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
    connectBusboy({limits: {
      fileSize: 57670000, // 55MB
      fields: 5,
      files: 1
    }}),
    route
  );
}

interface Body {
  tempID?: string, 
  socketID?: string, 
  buttons: string, 
  htmlEmbed: string, 
  // TODO: rename this to "content" (also in db)
  message: string
}

async function route (req: Request, res: Response){
  const { channelId } = req.params;
  const body = req.body as Body;

  const isFileMessage = req.busboy;
  const [fileMessage, error] = await handleFile(req);
  if (error) return res.status(403).json({message: error});

  Log.debug("test")

};

enum CDN {
  GOOGLE_DRIVE = 0,
  NERTIVIA_CDN = 1 
}

const handleFile = (req: Request): Promise<[null | any, null | string]> => new Promise(resolve => {
  if (!req.busboy) {
    resolve([null, null])
    return;
  }
  // fields: message, upload_cdn, compress file;
  let message = null;
  let upload_cdn = null;
  let compress = null;
  let file: null | Readable = null;
  
  req.busboy.on("field", (field: string, value: string) => {
    console.log("field")
    if (file) {
      req.unpipe(req.busboy);
      resolve([null, "File must be last in form-data."]);
      return 
    }
  })
  req.busboy.on("file", (name, stream, info) => {

    if (name !== "file") {
      req.unpipe(req.busboy);
      resolve([null, "File field name must be 'file'."]);
      return 
    }
    // if (upload_cdn === null || )
    file = stream;
  })
  req.pipe(req.busboy)
});