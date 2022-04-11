import { Router } from "express";
import { surveyDetails } from "./surveyDetails";
import { surveyUpdate } from "./surveyUpdate";

const SurveyRouter = Router();


surveyDetails(SurveyRouter);
surveyUpdate(SurveyRouter);


export { SurveyRouter };
