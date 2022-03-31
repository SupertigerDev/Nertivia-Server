import {PublicThemes} from '../../models/PublicThemes'

module.exports = async (req, res, next) => {
  const themes = await PublicThemes.find({$or: [{approved: false}, {updatedCss: {$exists: true}}] }).select('-_id id description screenshot theme approved').populate('theme', ' -_id name id');
  res.json(themes);
};

