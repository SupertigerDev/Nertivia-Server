const express = require('express');
const router = express.Router();

const path = require('path');
//Middlewares
const loadFiles = require('./../middlewares/loadFiles');


router.get('/*', loadFiles)

module.exports = router;