const MainErrorReportRouter = require("express").Router();

// Middleware
import { rateLimit } from "../../middlewares/rateLimit.middleware";
const policy = require("../../policies/errorReportPolicies");


// report error
MainErrorReportRouter.route("/").post(
  rateLimit({name: 'error_report', expire: 600, requestsLimit: 10, userIp: true}),
  policy.post,
  require("./reportError")
);





module.exports = MainErrorReportRouter;
