import React, { useEffect, useState } from 'react';
import { ExportTypeStep } from './ExportTypeStep';
import { ExportFormatStep } from './ExportFormatStep';

export type ExportType = 'summary' | 'transcript';

interface ExportNoteWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (type: ExportType, format: string) => void;
}

/** Two-step "export a note" flow (pick summary/transcript, then pick a file
 *  format) as a single mounted modal, so the host screen tracks one visible
 *  flag instead of two modals plus the chosen type. */
export const ExportNoteWizardModal: React.FC<ExportNoteWizardModalProps> = ({
  visible,
  onClose,
  onExport,
}) => {
  const [step, setStep] = useState<'type' | 'format'>('type');
  const [exportType, setExportType] = useState<ExportType | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('type');
      setExportType(null);
    }
  }, [visible]);

  const handleSelectType = (type: ExportType) => {
    setExportType(type);
    setStep('format');
  };

  const handleExport = (format: string) => {
    if (exportType) onExport(exportType, format);
  };

  if (step === 'format') {
    return (
      <ExportFormatStep
        visible={visible}
        exportType={exportType}
        onClose={onClose}
        onExport={handleExport}
      />
    );
  }

  return (
    <ExportTypeStep
      visible={visible}
      onClose={onClose}
      onSelectExportType={handleSelectType}
    />
  );
};
