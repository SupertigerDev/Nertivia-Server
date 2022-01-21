import { PublicThemes } from "../models/PublicThemes";
import { Themes } from "../models/Themes";
import flake from "../utils/genFlakeId";

interface Theme {
  id?: string;
  name: string;
  css: string;
  client_version: string;
  creator: string;
}

export async function createTheme(data: Theme) {
  // check how many themes the user has made.
  const count = await Themes.countDocuments({creator: data.creator});
  if (count >= 30) {
    throw {statusCode: 403, message: 'Too many themes! (Max: 30)'};
  }
  const id = flake.gen();
  const theme = await Themes.create({
    name: data.name, 
    css: data.css,
    id,
    client_version: data.client_version,
    creator: data.creator,
  });
  return theme;
}

export async function updateTheme(id: string, creatorObjectId: string, data: Partial<Theme>) {
  const theme = await Themes.findOne({ id, creator: creatorObjectId }, { _id: 0 }).select("name id");
  if (!theme) {
    throw {statusCode: 404, message: "Theme does not exist!"};
  }
  await Themes.updateOne(
    { id },
    {
      name: data.name,
      css: data.css,
      client_version: data.client_version
    },
    { upsert: true }
  );
  return data;
}

export async function getTheme(id: string) {
  const theme = await Themes.findOne({id: id}).select('name id css client_version');
  if (!theme) return null;
  return theme;
}
export async function getThemesByCreatorId(id: string) {
  const themes = await Themes.find({creator: id}, {_id: 0}).select('name id client_version');
  return themes;
}

export async function deleteTheme(id: string, creatorObjectId: string) {
  const theme = await Themes.findOne({ id, creator: creatorObjectId }).select("name id");

  if (!theme) {
    throw {statusCode: 404, message: "Theme does not exist!"};
  }
  
  await Themes.deleteOne({id});
  await PublicThemes.deleteOne({theme: theme._id});
  return true;
}