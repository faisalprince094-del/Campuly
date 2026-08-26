import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

const MainContent: React.FC = () => {
  const { activeTab, subTab } = useApp();

  return (
    <AppShell>
      {(activeTab === 'dashboard' || activeTab === 'home') && <HomeDashboard />}
      {activeTab === 'study' && <StudySection />}
      {activeTab === 'create' && (subTab === 'ai-tools' || subTab === 'ai-hub' ? <AIToolsHub /> : <PresentationMaker />)}
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

