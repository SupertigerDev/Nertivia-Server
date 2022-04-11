import { Router } from "express";
const RelationshipRouter = Router();

import {friendRequest} from './friendRequest';
import {friendAccept} from './friendAccept';
import {friendRemove} from './friendRemove';

friendRequest(RelationshipRouter);
friendAccept(RelationshipRouter);
friendRemove(RelationshipRouter);


export { RelationshipRouter };
