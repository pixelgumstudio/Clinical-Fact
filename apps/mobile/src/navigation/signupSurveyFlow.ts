import type { AuthStackParamList } from './AuthNavigator';

type SurveyRoute = keyof AuthStackParamList;

// The two question groups of the sign-up flow, in order. A screen listed in HIDDEN_SURVEY_SCREENS stays
// registered in the navigator but is skipped: the screen before it continues to the next visible one and
// the progress bars count only what is shown. To bring a screen back, remove it from HIDDEN_SURVEY_SCREENS.
const SURVEY: SurveyRoute[] = ['Role', 'CurrentMethod', 'TimeDrain', 'AppExpectation', 'AiToolsUsed', 'AiToolIssue', 'AiTrustLevel', 'BiggestNeed'];
const MINI_SURVEY: SurveyRoute[] = ['Referral', 'StudyTime', 'ComingUp'];

export const HIDDEN_SURVEY_SCREENS: ReadonlySet<SurveyRoute> = new Set<SurveyRoute>([
  'CurrentMethod', // How do you usually find answers to medical questions right now?
  'AppExpectation', // What do you expect from our app?
  'AiToolsUsed', // Which AI tools have you used so far?
  'AiToolIssue', // What went wrong with those tools?
  'AiTrustLevel', // How often do you worry an AI answer might be wrong?
  'StudyTime', // How much time do you have to study each week?
]);

const groupOf = (route: SurveyRoute) => [SURVEY, MINI_SURVEY].find((g) => g.includes(route));
const visible = (group: SurveyRoute[]) => group.filter((r) => !HIDDEN_SURVEY_SCREENS.has(r));

/** The next shown screen after `route` in its group (hidden ones are skipped), or null at the end of the group. */
export function nextSurveyRoute(route: SurveyRoute): SurveyRoute | null {
  const group = groupOf(route);
  if (!group) return null;
  const after = group.slice(group.indexOf(route) + 1);
  return after.find((r) => !HIDDEN_SURVEY_SCREENS.has(r)) ?? null;
}

/** "Step n of m" for a shown screen, counting only the screens that are shown. */
export function surveyProgress(route: SurveyRoute): { step: number; totalSteps: number } {
  const group = groupOf(route);
  if (!group) return { step: 1, totalSteps: 1 };
  const shown = visible(group);
  return { step: Math.max(shown.indexOf(route), 0) + 1, totalSteps: shown.length };
}
