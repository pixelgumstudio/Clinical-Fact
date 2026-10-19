// apps/mobile/src/navigation/authStartRoute.ts
//
// Where a signed-out visitor lands after the splash: the language screen the first time the
// app is opened, the intro screen from then on. Signed-in users never reach the auth stack
// through here (see AppNavigator).

export type AuthStartRoute = 'Language' | 'Intro';

export function getAuthStartRoute(params: { languageChosen: boolean }): AuthStartRoute {
  return params.languageChosen ? 'Intro' : 'Language';
}
