/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { ReportProvider } from './context/ReportContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppLayout } from './components/layout/AppLayout';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-700/20 animate-pulse">
            8
          </div>
          <span className="text-xs font-bold text-purple-900 tracking-wider">
            Loading 8ATE Ghana...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <AppLayout />;
};

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <ReportProvider>
          <MainApp />
        </ReportProvider>
      </CallProvider>
    </AuthProvider>
  );
}
