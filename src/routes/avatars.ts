const express = require('express');
const router = express.Router();

const path = require('path');
//Middlewares
// const checkGDriveAvatar = require('./../middlewares/checkGDriveAvatar');
// const avatarCache = require('./../middlewares/avatarCache');
import loadAvatar from '../middlewares/loadAvatar'


router.get('/*', loadAvatar,
	(_req: any, res: any) =>
	res.sendFile(path.join(__dirname, '../public/avatars/default.png'))
)

export default router;