import Database from 'better-sqlite3';

const sqlite = new Database('./sherpy.db');
const result = sqlite.prepare('SELECT project_id, step_number, value FROM planning_state WHERE project_id = ? LIMIT 1').get('seed-mprbm4jm');

if (result) {
  const snapshot = JSON.parse(result.value);
  console.log(JSON.stringify({
    projectId: result.project_id,
    stepNumber: result.step_number,
    currentStepNumber: snapshot.context?.currentStepNumber,
    completedSteps: snapshot.context?.completedSteps,
    value: snapshot.value
  }, null, 2));
} else {
  console.log('No database record found');
}

sqlite.close();
