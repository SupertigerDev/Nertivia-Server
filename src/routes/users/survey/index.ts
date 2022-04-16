import { Router } from "express";
import { surveyDetails } from "./surveyDetails.route";
import { surveyUpdate } from "./surveyUpdate.route";

const SurveyRouter = Router();


surveyDetails(SurveyRouter);
surveyUpdate(SurveyRouter);


export { SurveyRouter };
