import { Router } from 'express';

const htmlProfileRouter = Router();

import { htmlProfileUpdate } from './htmlProfileUpdate';
import { htmlProfileGet } from './htmlProfileGet';
import { htmlProfileDelete } from './htmlProfileDelete';

htmlProfileUpdate(htmlProfileRouter)
htmlProfileGet(htmlProfileRouter)
htmlProfileDelete(htmlProfileRouter)



export {htmlProfileRouter};
