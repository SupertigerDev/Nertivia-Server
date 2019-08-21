
const express = require('express');
const router = express.Router();

const loadFiles = require('./../middlewares/loadFiles');
const loadMedia = require('./../middlewares/loadMedia');

router.use('/user', require('./users'));

router.use('/servers', require('./servers'));
router.use('/channels', require('./channels'));
router.use('/messages', require('./messages'));
router.use('/settings', require('./settings'));
router.use('/avatars', require('./avatars'));
router.use('/files/*', loadFiles);
router.use('/media/*', loadMedia);
 
module.exports = router;