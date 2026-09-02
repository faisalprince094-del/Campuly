import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthView } from './components/auth/AuthView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AppShell } from './components/layout/AppShell';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { PresentationMaker } from './components/create/PresentationMaker';
import { AIToolsHub } from './components/create/AIToolsHub';
import { AIAssistantPage } from './components/assistant/AIAssistantPage';
import { StudySection } from './components/study/StudySection';
import { FinanceSection } from './components/finance/FinanceSection';
import { PlannerSection } from './components/planner/PlannerSection';
import { NotificationsPage } from './components/notifications/NotificationsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsPage } from './components/settings/SettingsPage';
import { Toast } from './components/ui/Toast';
import { AddTaskModal } from './components/modals/AddTaskModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { AddEventModal } from './components/modals/AddEventModal';
import { QuickActionsModal } from './components/modals/QuickActionsModal';
import { ReportIssueModal } from './components/modals/ReportIssueModal';
import { CampuslyLogo } from './components/ui/CampuslyLogo';

const MainContent: React.FC = () => {
  const { user, isAuthenticated, isAuthLoading, activeTab, subTab } = useApp();

  // Loading state during session restoration
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] dark:bg-[#05070A] flex flex-col items-center justify-center gap-3">
        <CampuslyLogo size="lg" />
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Restoring secure session...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, render the Auth View (Student Sign In, Sign Up, Admin Portal)
  if (!isAuthenticated || !user) {
    return (
      <>
        <AuthView />
        <Toast />
      </>
    );
  }

  // If authenticated as administrator, render Admin Dashboard
  if (user.role === 'admin') {
    return (
      <>
        <AdminDashboard />
        <Toast />
      </>
    );
  }

  // Standard student portal
  return (
    <AppShell>
      {(activeTab === 'dashboard' || activeTab === 'home') && <HomeDashboard />}
      {activeTab === 'study' && <StudySection />}
      {activeTab === 'create' &&
        (subTab === 'ai-tools' || subTab === 'ai-hub' ? <AIToolsHub /> : <PresentationMaker />)}
      {activeTab === 'ai-assistant' && <AIAssistantPage />}
      {activeTab === 'finance' && <FinanceSection />}
      {activeTab === 'planner' && <PlannerSection />}
      {activeTab === 'notifications' && <NotificationsPage />}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'settings' && <SettingsPage />}

      {/* Global Modals */}
      <AddTaskModal />
      <AddExpenseModal />
      <AddEventModal />
      <QuickActionsModal />
      <ReportIssueModal />
      <Toast />
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
