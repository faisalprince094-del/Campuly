import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from '../ui/Toast';
import { AddExpenseModal } from '../modals/AddExpenseModal';
import { AddTaskModal } from '../modals/AddTaskModal';
import { AddEventModal } from '../modals/AddEventModal';
import { QuickActionsModal } from '../modals/QuickActionsModal';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#05070A] text-[#0F172A] dark:text-[#F8FAFC] transition-colors">
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-10 overflow-x-hidden">
        {/* Sticky TopBar */}
        <TopBar />

        {/* Dynamic Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Modals & Toasts */}
      <AddExpenseModal />
      <AddTaskModal />
      <AddEventModal />
      <QuickActionsModal />
      <ToastContainer />
    </div>
  );
};
