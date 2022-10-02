import { Router } from "express";

import { customEmojiAdd } from "./customEmojiAdd.route";
import { customEmojiDelete } from "./customEmojiDelete.route";
import { customEmojiRename } from "./customEmojiRename.route";
import { customStatusChange } from "./customStatusChange.route";
import { googleDriveAuthenticate } from "./googleDriveAuthenticate.route";
import { googleDriveConsentUrl } from "./googleDriveConsentUrl.route";
import { serverPositionUpdate } from "./serverPositionUpdate.route";
import { statusChange } from "./statusChange.route";




const AccountRouter = Router();

customEmojiAdd(AccountRouter);
customEmojiDelete(AccountRouter);
customEmojiRename(AccountRouter);
customStatusChange(AccountRouter);
googleDriveAuthenticate(AccountRouter);
googleDriveConsentUrl(AccountRouter);
serverPositionUpdate(AccountRouter);
statusChange(AccountRouter);



export { AccountRouter }
