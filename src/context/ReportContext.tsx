import React, { createContext, useContext, useState } from 'react';
import { ReportTargetType, ReportReason } from '../types';
import { safetyService } from '../services';

interface ReportTargetInfo {
  type: ReportTargetType;
  id: string;
  summary: string;
}

interface ReportContextType {
  reportTarget: ReportTargetInfo | null;
  openReport: (type: ReportTargetType, id: string, summary: string) => void;
  closeReport: () => void;
  submitReport: (reporterUserId: string, reason: ReportReason, details?: string) => Promise<void>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reportTarget, setReportTarget] = useState<ReportTargetInfo | null>(null);

  const openReport = (type: ReportTargetType, id: string, summary: string) => {
    setReportTarget({ type, id, summary });
  };

  const closeReport = () => {
    setReportTarget(null);
  };

  const submitReport = async (reporterUserId: string, reason: ReportReason, details?: string) => {
    if (!reportTarget) return;
    await safetyService.submitReport({
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      targetSummary: reportTarget.summary,
      reporterUserId,
      reason,
      details,
    });
    // The modal owns its success state and closes itself after showing confirmation.
  };

  return (
    <ReportContext.Provider value={{ reportTarget, openReport, closeReport, submitReport }}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReport = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
};
