import React, { useEffect, useState } from 'react';
import { ShieldAlert, X, Check } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { ReportReason } from '../../types';
import { safetyService } from '../../services';

export const ReportModal: React.FC = () => {
  const { reportTarget, closeReport, submitReport } = useReport();
  const { user, refreshUser } = useAuth();

  const [reason, setReason] = useState<ReportReason>('Spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setReason('Spam');
    setDetails('');
    setSubmitted(false);
    setReportError(null);
    setBlockError(null);
    setBlocking(false);
    setBlocked(false);
  }, [reportTarget?.id]);

  if (!reportTarget) return null;

  const reasons: ReportReason[] = [
    'Spam',
    'Harassment',
    'Scam',
    'Hate/abuse',
    'Sexual content',
    'Violence',
    'Illegal activity',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setReportError(null);
    try {
      setSubmitting(true);
      await submitReport(user.id, reason, details);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        closeReport();
      }, 1800);
    } catch (err) {
      console.error('Report submission failed', err);
      setReportError(err instanceof Error ? err.message : 'The report could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user || reportTarget.type !== 'user' || reportTarget.id === user.id) return;
    const confirmed = window.confirm(`Block ${reportTarget.summary}? They will not be able to start or continue a direct chat with you in this demo.`);
    if (!confirmed) return;
    setBlockError(null);
    setBlocking(true);
    try {
      await safetyService.blockUser(user.id, reportTarget.id);
      await refreshUser();
      setBlocked(true);
    } catch (err) {
      console.error('Block user failed', err);
      setBlockError(err instanceof Error ? err.message : 'This user could not be blocked.');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-2 text-red-700 font-extrabold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Report Content to 8ATE Safety</span>
          </div>
          <button
            onClick={closeReport}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Report Submitted</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Demo report saved locally. No moderation team receives this report in the prototype.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {reportError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">{reportError}</div>}
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <span className="font-bold text-gray-700 uppercase tracking-wider block mb-0.5">Target</span>
              <p className="text-gray-900 font-medium truncate">{reportTarget.summary}</p>
            </div>
            {reportTarget.type === 'user' && reportTarget.id !== user?.id && (
              <div className="mt-3">
                <button type="button" onClick={handleBlockUser} disabled={blocking || blocked} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
                  {blocking ? 'Blocking…' : blocked ? 'User blocked' : 'Block this user'}
                </button>
                {blockError && <p role="alert" className="mt-1 text-[11px] text-red-700">{blockError}</p>}
                {blocked && <p className="mt-1 text-[11px] text-green-700">Direct messaging is now blocked in this demo.</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason for report
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {reasons.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setReason(r)}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-lg border text-left transition-colors ${
                      reason === r
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Additional context (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain why this content violates community safety..."
                rows={3}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-hidden focus:border-red-400 focus:ring-1 focus:ring-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={closeReport}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
