import { HIDDEN_SURVEY_SCREENS, nextSurveyRoute, surveyProgress } from '../signupSurveyFlow';

describe('sign-up survey flow with hidden screens', () => {
  test('the six requested screens are hidden', () => {
    expect([...HIDDEN_SURVEY_SCREENS].sort()).toEqual(
      ['AiToolIssue', 'AiToolsUsed', 'AiTrustLevel', 'AppExpectation', 'CurrentMethod', 'StudyTime'].sort()
    );
  });

  test('the main survey skips straight over the hidden screens', () => {
    expect(nextSurveyRoute('Role')).toBe('TimeDrain');
    expect(nextSurveyRoute('TimeDrain')).toBe('BiggestNeed');
    expect(nextSurveyRoute('BiggestNeed')).toBeNull(); // the screen itself continues to Thanks
  });

  test('the mini survey skips Study Time', () => {
    expect(nextSurveyRoute('Referral')).toBe('ComingUp');
    expect(nextSurveyRoute('ComingUp')).toBeNull();
  });

  test('a path through the flow never lands on a hidden screen', () => {
    for (let route = 'Role' as any, guard = 0; route && guard < 20; route = nextSurveyRoute(route), guard++) {
      expect(HIDDEN_SURVEY_SCREENS.has(route)).toBe(false);
    }
    for (let route = 'Referral' as any, guard = 0; route && guard < 20; route = nextSurveyRoute(route), guard++) {
      expect(HIDDEN_SURVEY_SCREENS.has(route)).toBe(false);
    }
  });

  test('progress counts only the screens that are shown', () => {
    expect(surveyProgress('Role')).toEqual({ step: 1, totalSteps: 3 });
    expect(surveyProgress('TimeDrain')).toEqual({ step: 2, totalSteps: 3 });
    expect(surveyProgress('BiggestNeed')).toEqual({ step: 3, totalSteps: 3 });
    expect(surveyProgress('Referral')).toEqual({ step: 1, totalSteps: 2 });
    expect(surveyProgress('ComingUp')).toEqual({ step: 2, totalSteps: 2 });
  });
});
