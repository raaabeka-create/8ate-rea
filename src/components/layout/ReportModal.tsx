import React, { useState } from 'react';
import { ShieldAlert, X, Check } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { ReportReason } from '../../types';

export const ReportModal: React.FC = () => {
  const { reportTarget, closeReport, submitReport } = useReport();
  const { user } = useAuth();

  const [reason, setReason] = useState<ReportReason>('Spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    } finally {
      setSubmitting(false);
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
              Thank you for keeping 8ATE safe for all Ghanaian communities. Our moderation system will review this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <span className="font-bold text-gray-700 uppercase tracking-wider block mb-0.5">Target</span>
              <p className="text-gray-900 font-medium truncate">{reportTarget.summary}</p>
            </div>

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
