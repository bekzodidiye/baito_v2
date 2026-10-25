import React from 'react';
import { SettingsSidebar } from './SettingsSidebar';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

// The card used to be pinned to `md:h-[calc(100vh-2rem)]`, so it filled the
// viewport whether or not there was anything in it - which is where the empty
// half-screen under the settings list came from. Height follows the content
// now, with min-h keeping short pages from looking stranded.
//
// max-w-6xl centred the card in the middle of the window back when it was the
// only thing on screen. It sits beside the app's rail now, so it takes the
// width it is given and caps at 7xl rather than floating.
//
// No `w-full`: width:100% ignores the horizontal margin, so the card ran 16px
// past the right edge of a 1440px window once mx-4 was added. A block element
// left to size itself subtracts its own margins.
export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const { currentScreen } = useCurrentScreen();
  const isChat = currentScreen === 'support-chat';

  return (
    <div
      id="settings-layout-wrapper"
      className={`flex-1 flex flex-col md:flex-row bg-brand-surface max-w-7xl rounded-none md:rounded-2xl overflow-hidden my-0 md:my-4 md:mx-4 md:border md:border-slate-200/80 md:shadow-2xs md:min-h-[32rem] ${
        isChat ? 'h-dvh md:h-auto' : ''
      }`}
    >
      {/* Internal Settings Sub-Sidebar for Desktop */}
      <SettingsSidebar />
      
      {/* Right Settings Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-brand-surface relative ${isChat ? 'h-dvh md:h-full' : 'h-full'}`}>
        {children}
      </div>
    </div>
  );
};
