import { Router } from 'express';

const htmlProfileRouter = Router();

import { htmlProfileUpdate } from './htmlProfileUpdate.route';
import { htmlProfileGet } from './htmlProfileGet.route';
import { htmlProfileDelete } from './htmlProfileDelete.route';

htmlProfileUpdate(htmlProfileRouter)
htmlProfileGet(htmlProfileRouter)
htmlProfileDelete(htmlProfileRouter)



export {htmlProfileRouter};
