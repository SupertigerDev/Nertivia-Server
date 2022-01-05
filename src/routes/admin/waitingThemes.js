import {PublicThemes} from '../../models/PublicThemes'

module.exports = async (req, res, next) => {
  const themes = await PublicThemes.find({$or: [{approved: false}, {updatedCss: {$exists: true}}] }, {_id: 0}).select('id description screenshot theme approved').populate('theme', ' -_id name id');
  res.json(themes);
};

