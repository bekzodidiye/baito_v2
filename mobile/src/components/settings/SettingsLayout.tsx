import React from 'react';
import { SettingsSidebar } from './SettingsSidebar';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  return (
    <div
      id="settings-layout-wrapper"
      className="w-full flex-1 flex flex-col md:flex-row bg-brand-surface h-full min-h-0 overflow-hidden"
    >
      {/* Internal Settings Sub-Sidebar for Desktop */}
      <SettingsSidebar />
      
      {/* Right Settings Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-brand-surface relative h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};
