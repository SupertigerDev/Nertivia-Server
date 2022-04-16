
import { Router } from "express";
const UserRouter = Router();

import { userRegister } from "./userRegister.route";
import { termsAgree } from "./termsAgree.route";
import { userBlock } from "./userBlock.route";
import { userDetails } from "./userDetails.route";
import { userUnblock } from "./userUnblock.route";
import { userUpdate } from "./userUpdate.route";
import { userWelcomeDone } from "./userWelcomeDone.route";
import { userLogin } from "./userLogin.route";
import { userConfirmEmail } from "./userConfirmEmail.route";
import { userDeleteAccount } from "./userDeleteAccount.route";
import { userResetPasswordRequest } from "./userResetPasswordRequest.route";
import { userResetPassword } from "./userResetPassword.route";
import { userLogout } from "./userLogout.route";
import { htmlProfileUpdate } from "./htmlProfileUpdate.route";
import { htmlProfileGet } from "./htmlProfileGet.route";
import { htmlProfileDelete } from "./htmlProfileDelete.route";
import { friendRequest } from "./friendRequest.route";
import { friendAccept } from "./friendAccept.route";
import { friendRemove } from "./friendRemove.route";
import { surveyUpdate } from "./surveyUpdate.route";
import { surveyDetails } from "./surveyDetails.route";





// Relationship
friendRequest(UserRouter);
friendAccept(UserRouter);
friendRemove(UserRouter);

// Survey
surveyDetails(UserRouter);
surveyUpdate(UserRouter);

// HTML Profile
htmlProfileUpdate(UserRouter)
htmlProfileGet(UserRouter)
htmlProfileDelete(UserRouter)


userWelcomeDone(UserRouter);

userUpdate(UserRouter);

userBlock(UserRouter);
userUnblock(UserRouter);

termsAgree(UserRouter);

userDetails(UserRouter);

userRegister(UserRouter);
userConfirmEmail(UserRouter);
userLogin(UserRouter);
userDeleteAccount(UserRouter);
userResetPasswordRequest(UserRouter);
userResetPassword(UserRouter);
userLogout(UserRouter);


export { UserRouter };
