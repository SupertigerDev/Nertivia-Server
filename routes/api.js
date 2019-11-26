
const express = require('express');
const router = express.Router();

const loadMedia = require('./../middlewares/loadMedia');

router.use('/user', require('./users'));
router.use('/devices', require('./devices'));
router.use('/servers', require('./servers'));
router.use('/channels', require('./channels'));

router.use('/explore', require('./explore'))

router.use('/messages', require('./messages'));

router.use('/settings', require('./settings'));

router.use('/avatars', require('./avatars'));
router.use('/files/*', loadMedia);
router.use('/media/*', loadMedia);
 
module.exports = router;