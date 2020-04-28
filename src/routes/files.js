const request = require("request");
import config from '../config';
const path = require('path');
const sharp = require('sharp')
const {google} = require('googleapis');

module.exports = async (req, res, next) => {
  const id = req.params["0"].split("/")[0];

  res.redirect("https://drive.google.com/uc?export=view&id=" + id)

};
