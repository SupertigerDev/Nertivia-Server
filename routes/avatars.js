const express = require('express');
const router = express.Router();

const path = require('path');
//Middlewares
const checkGDriveAvatar = require('./../middlewares/checkGDriveAvatar');
const avatarCache = require('./../middlewares/avatarCache');



router.get('/*', avatarCache, checkGDriveAvatar,
	(req, res) =>
	res.sendFile(path.join(__dirname, '../public/avatars/default.png'))
)

module.exports = router;