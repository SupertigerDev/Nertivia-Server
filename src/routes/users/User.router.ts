
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





// Relationship
UserRouter.use("/relationship", require("./relationship").RelationshipRouter);

// Survey
UserRouter.use("/survey", require("./survey").SurveyRouter);

UserRouter.use("/html-profile", require("./htmlProfile").htmlProfileRouter);


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
