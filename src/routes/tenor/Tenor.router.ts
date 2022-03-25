import { Router } from "express";


const TenorRouter = Router();

import {tenorCategories} from './tenorCategories.route';
import {tenorSearch} from './tenorSearch.route';

tenorCategories(TenorRouter);
tenorSearch(TenorRouter);

export {TenorRouter};