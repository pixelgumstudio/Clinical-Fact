import { useCallback, useState } from 'react';

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  buttonText: string;
  onButtonPress?: () => void;
}

/** Centralizes the visible/title/message/buttonText state every screen was
 *  duplicating around CustomAlertModal. Pair with <AlertDialog /> for rendering. */
export const useAlertDialog = (defaultButtonText = 'OK') => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    buttonText: defaultButtonText,
  });

  const showAlert = useCallback(
    (title: string, message: string, buttonText: string = defaultButtonText, onButtonPress?: () => void) => {
      setAlertConfig({ visible: true, title, message, buttonText, onButtonPress });
    },
    [defaultButtonText]
  );

  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  return { alertConfig, showAlert, closeAlert };
};
