const MainServersRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");


// get public servers list
MainServersRouter.route('/').get(
  passportJWT,
  require("./getPublicServersList")
);

// get a server
MainServersRouter.route('/:server_id').get(
  passportJWT,
  require("./getServer")
);

// update  public server
MainServersRouter.route('/:server_id').patch(
  passportJWT,
  require("./updatePublicServersList")
);

// delete  public server
MainServersRouter.route('/:server_id').delete(
  passportJWT,
  require("./deletePublicServersList")
);

// add to public servers list
MainServersRouter.route('/').post(
  passportJWT,
  require("./addPublicServersList")
);




module.exports = MainServersRouter;
