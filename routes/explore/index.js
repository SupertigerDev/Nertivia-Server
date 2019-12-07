const MainExploreRouter = require("express").Router();


// servers
MainExploreRouter.use('/servers', require('./servers'));

// themes
MainExploreRouter.use('/themes', require('./themes'));




module.exports = MainExploreRouter;
