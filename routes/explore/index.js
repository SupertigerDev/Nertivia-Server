const MainExploreRouter = require("express").Router();


// servers
MainExploreRouter.use('/servers', require('./servers'));




module.exports = MainExploreRouter;
