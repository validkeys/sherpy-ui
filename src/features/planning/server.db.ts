/**
 * Database operations for planning features
 * This file uses .db.ts extension to clearly separate DB operations
 * All imports from lib/db are isolated here to prevent client bundling (BUG-017)
 */

import {
  getArtifact as dbGetArtifact,
  getArtifacts as dbGetArtifacts,
} from "../../lib/db/artifact";
import {
  getFormResponses as dbGetFormResponses,
  saveFormResponse as dbSaveFormResponse,
} from "../../lib/db/form";
import {
  getInterviewAnswers as dbGetInterviewAnswers,
  saveInterviewAnswer as dbSaveInterviewAnswer,
} from "../../lib/db/interview";
import {
  deletePlanningState as dbDeletePlanningState,
  hasPlanningState as dbHasPlanningState,
  loadPlanningState as dbLoadPlanningState,
  savePlanningState as dbSavePlanningState,
} from "../../lib/db/planning";

// Re-export with simpler names for server functions to use
export const saveInterviewAnswer = dbSaveInterviewAnswer;
export const getInterviewAnswers = dbGetInterviewAnswers;
export const savePlanningState = dbSavePlanningState;
export const loadPlanningState = dbLoadPlanningState;
export const deletePlanningState = dbDeletePlanningState;
export const hasPlanningState = dbHasPlanningState;
export const saveFormResponse = dbSaveFormResponse;
export const getFormResponses = dbGetFormResponses;
export const getArtifact = dbGetArtifact;
export const getArtifacts = dbGetArtifacts;
