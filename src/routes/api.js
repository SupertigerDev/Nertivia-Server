
const express = require('express');
const router = express.Router();

const loadMedia = require('./../middlewares/loadMedia');


import avatars from './avatars';

router.use('/user', require('./users'));
router.use('/devices', require('./devices'));
router.use('/servers', require('./servers'));
router.use('/channels', require('./channels'));
router.use('/themes', require('./themes'))
router.use('/bots', require('./bots'))

router.use('/explore', require('./explore'))

router.use('/messages', require('./messages'));

router.use('/settings', require('./settings'));

router.use('/avatars', avatars);
router.use('/files/*', require('./files'));
router.use('/media/*', loadMedia);

router.use('/admin', require('./admin'));
 
module.exports = router;