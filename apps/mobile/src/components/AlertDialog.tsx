import React from 'react';
import { CustomAlertModal } from './CustomAlertModal';
import type { AlertConfig } from '../hooks/useAlertDialog';

interface AlertDialogProps {
  alertConfig: AlertConfig;
  onClose: () => void;
}

/** Renders the config produced by useAlertDialog — pairs the hook's state with
 *  CustomAlertModal so call sites don't have to spread out the four fields by hand. */
export const AlertDialog = ({ alertConfig, onClose }: AlertDialogProps) => (
  <CustomAlertModal
    visible={alertConfig.visible}
    title={alertConfig.title}
    message={alertConfig.message}
    buttonText={alertConfig.buttonText}
    onClose={onClose}
    onButtonPress={alertConfig.onButtonPress}
  />
);
