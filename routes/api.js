
const express = require('express');
const router = express.Router();

const loadFiles = require('./../middlewares/loadFiles');

router.use('/user', require('./users'));
router.use('/channels', require('./channels'));
router.use('/messages', require('./messages'));
router.use('/settings', require('./settings'));
router.use('/avatars', require('./avatars'));
router.use('/files/*', loadFiles);

module.exports = router;