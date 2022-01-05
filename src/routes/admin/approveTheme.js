import {PublicThemes} from '../../models/PublicThemes'

module.exports = async (req, res, next) => {
  const { id } = req.params;
  const theme = await PublicThemes.findOne({id: id}).select('id description screenshot theme approved css updatedCss').populate('theme', ' -_id name id');

  let query = {}

  try {
    if (!theme.approved) {
      query.approved = true;
    } else if (theme.updatedCss) {
      query.$unset = {
        updatedCss: 1
      },
      query.css = theme.updatedCss
    } else {
      res.status(403).json({message: 'Theme is already up to date.'});
      return;
    }

    await PublicThemes.updateOne({id}, query, {upsert: true})
    res.status(200).end();
  } catch(e) {
    console.log(e)
    res.status(403).json({messsage: "Something wen't wrong. Try again later."});
  }



};

