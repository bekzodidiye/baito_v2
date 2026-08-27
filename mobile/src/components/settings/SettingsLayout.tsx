import React from 'react';
import { SettingsSidebar } from './SettingsSidebar';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  return (
    <div id="settings-layout-wrapper" className="w-full flex-1 flex flex-col md:flex-row bg-brand-surface max-w-6xl mx-auto rounded-none md:rounded-2xl overflow-hidden my-0 md:my-4 md:border md:border-slate-200/80 md:shadow-2xs h-full md:h-[calc(100vh-2rem)]">
      {/* Internal Settings Sub-Sidebar for Desktop */}
      <SettingsSidebar />
      
      {/* Right Settings Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-brand-surface relative h-full">
        {children}
      </div>
    </div>
  );
};
