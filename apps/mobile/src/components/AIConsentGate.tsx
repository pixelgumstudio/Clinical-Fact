import React from 'react';
import { useAIConsentStore } from '../store/aiConsentStore';
import { AIConsentModal } from './AIConsentModal';

/** Mounted once at the app root so it can intercept every AI-triggering flow —
 *  chat, quiz/flashcard generation, and note creation — regardless of which
 *  screen or navigator stack the action originates from. */
export const AIConsentGate = () => {
  const isModalVisible = useAIConsentStore((state) => state.isModalVisible);
  const acceptConsent = useAIConsentStore((state) => state.acceptConsent);
  const declineConsent = useAIConsentStore((state) => state.declineConsent);

  return (
    <AIConsentModal
      visible={isModalVisible}
      onAccept={acceptConsent}
      onDecline={declineConsent}
    />
  );
};
