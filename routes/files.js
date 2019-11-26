const express = require('express');
const router = express.Router();

const path = require('path');
//Middlewares
const loadFiles = require('./../middlewares/loadMedia');


router.get('/*', loadFiles)

module.exports = router;