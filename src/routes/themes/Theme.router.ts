import { themeGet } from './themeGet.route';
import { themeGetBatch } from './themeGetBatch.route';
import { themeDelete } from './themeDelete.route';
import { themeCreate } from './themeCreate.route';
import { themeUpdate } from './themeUpdate.route';

import { Router } from 'express';

const ThemeRouter = Router();

themeGet(ThemeRouter)
themeDelete(ThemeRouter)
themeGetBatch(ThemeRouter)
themeCreate(ThemeRouter)
themeUpdate(ThemeRouter)

export {ThemeRouter};