// apps/mobile/src/services/languageSync.ts
//
// Decides which language the app uses right after someone signs in, given the language they
// may have picked on the first-launch screen (before having an account).
//
//  - A brand-new account takes the pick: it starts on the server default (English), and the
//    pick is then saved to it so it survives relaunches.
//  - An existing account keeps its own saved language. Someone logging back in on a new phone
//    should get the language they set up, not whatever they tapped on the way in.

export interface LanguageResolution {
  /** The language to show now. */
  language: string | undefined;
  /** Save `language` to the account. */
  syncToAccount: boolean;
  /** Forget the pending pick once the above is done (or is not needed). */
  clearPending: boolean;
}

export function resolveLanguageAfterAuth(params: {
  pending: string | null;
  isFirstTimeUser: boolean;
  accountLanguage: string | undefined;
}): LanguageResolution {
  const { pending, isFirstTimeUser, accountLanguage } = params;

  if (!pending) {
    return { language: accountLanguage, syncToAccount: false, clearPending: false };
  }
  if (!isFirstTimeUser) {
    return { language: accountLanguage, syncToAccount: false, clearPending: true };
  }
  const needsSync = pending !== accountLanguage;
  return { language: pending, syncToAccount: needsSync, clearPending: !needsSync };
}
