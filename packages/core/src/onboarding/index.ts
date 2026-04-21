// Types
export type {
  HarnessFile,
  ArchetypeSlug,
  TurnRole,
  InterviewTurn,
  DiffOp,
  FileDiff,
  HarnessDiff,
  BudgetConfig,
  BudgetStatus,
  InterviewStatus,
  InterviewState,
  InterviewResponse,
  InterviewerOptions,
} from './types';

// Constants
export {
  HARNESS_FILES_ALL,
  DEFAULT_BUDGET,
  InterviewResponseParseError,
  InterviewBudgetExceededError,
  InterviewDiffValidationError,
} from './types';

// Prompts + validation
export {
  loadInterviewerPrompt,
  loadInterviewerBase,
  loadScript,
  extractJsonBlock,
  validateInterviewResponse,
  validateHarnessDiff,
  validateDiffOp,
  VALID_PLACEHOLDER_KEYS,
  type ValidPlaceholderKey,
} from './prompts';

// Engine + merger + budget
export { Interviewer } from './interviewer';
export {
  applyDiff,
  previewDiff,
  applyOpToContent,
  applyOpsToContent,
  filterValidDiffs,
  type MergeResult,
} from './merger';
export {
  createBudgetTracker,
  type BudgetTracker,
} from './budget';
