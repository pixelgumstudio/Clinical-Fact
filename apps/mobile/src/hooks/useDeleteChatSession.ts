import { Dispatch, SetStateAction, useCallback } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

/** Deletes a chat session with an optimistic removal from the caller's list — the row is
 *  put back (and an error shown) if the request fails. Shared by every screen that lists chats. */
export function useDeleteChatSession<T extends { _id: string }>(
  setSessions: Dispatch<SetStateAction<T[]>>
) {
  const { t } = useTranslation();
  return useCallback(
    async (session: T) => {
      setSessions((prev) => prev.filter((s) => s._id !== session._id));
      const response = await api.deleteChatSession(session._id);
      if (!response.success) {
        setSessions((prev) => [...prev, session]);
        Alert.alert(t('common.error'), response.message || t('hooks.useDeleteChatSession.failedToDeleteChat'));
      }
    },
    [setSessions]
  );
}
