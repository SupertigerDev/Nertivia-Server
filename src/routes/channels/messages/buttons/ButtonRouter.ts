import { Router } from "express";

// middlewares
import { authenticate } from "../../../../middlewares/authenticate";
import { channelVerification } from "../../../../middlewares/ChannelVerification";
import rateLimit from "../../../../middlewares/rateLimit";

// routes
import { buttonClicked } from "./buttonClicked";
import { buttonReturned } from "./buttonReturned";



const ButtonRouter = Router();

ButtonRouter.route("/:channelId/messages/:messageId/buttons/:buttonId").post(
  authenticate(true),
  channelVerification,
  rateLimit({name: 'message_button_clicked', expire: 60, requestsLimit: 300 }),
  buttonClicked
);

// click message button callback (only used by (bot) message creator)
ButtonRouter.route("/:channelId/messages/:messageId/buttons/:buttonId").patch(
  authenticate(true),
  channelVerification,
  rateLimit({name: 'message_button_returned', expire: 60, requestsLimit: 300 }),
  buttonReturned
);




export { ButtonRouter }