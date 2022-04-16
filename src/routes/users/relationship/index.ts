import { Router } from "express";
const RelationshipRouter = Router();

import {friendRequest} from './friendRequest.route';
import {friendAccept} from './friendAccept.route';
import {friendRemove} from './friendRemove.route';

friendRequest(RelationshipRouter);
friendAccept(RelationshipRouter);
friendRemove(RelationshipRouter);


export { RelationshipRouter };
