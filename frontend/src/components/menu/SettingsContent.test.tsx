import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsContent } from './SettingsContent';
import { useUIStore } from '../../store/useUIStore';

vi.mock('../../api/queries', () => ({
  updateUserProfileApi: vi.fn().mockResolvedValue({ success: true }),
  fetchActiveSessionsApi: vi.fn().mockResolvedValue([]),
}));

describe('SettingsContent modal sub-sidebar navigation', () => {
  beforeEach(() => {
    useUIStore.getState().setActiveSettingsTab('settings');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 8 sub-navigation tabs in the desktop sidebar', () => {
    render(
      <MemoryRouter>
        <SettingsContent />
      </MemoryRouter>
    );

    expect(screen.getByText('Umumiy sozlamalar')).toBeTruthy();
    expect(screen.getByText('Xavfsizlik & Kirish')).toBeTruthy();
    expect(screen.getAllByText('Yordam markazi').length).toBeGreaterThan(0);
    expect(screen.getByText("Ko'p beriladigan savollar")).toBeTruthy();
    expect(screen.getByText("Foydalanish qo'llanmasi")).toBeTruthy();
    expect(screen.getByText('Maxfiylik siyosati')).toBeTruthy();
    expect(screen.getByText('Foydalanish shartlari')).toBeTruthy();
    expect(screen.getByText("Qo'llab-quvvatlash chati")).toBeTruthy();
  });

  it('switches activeSettingsTab when sub-sidebar buttons are clicked', async () => {
    render(
      <MemoryRouter>
        <SettingsContent />
      </MemoryRouter>
    );

    const securityBtn = screen.getByText('Xavfsizlik & Kirish');
    fireEvent.click(securityBtn);

    expect(useUIStore.getState().activeSettingsTab).toBe('security');

    const helpBtns = screen.getAllByText('Yordam markazi');
    fireEvent.click(helpBtns[0]);

    expect(useUIStore.getState().activeSettingsTab).toBe('help');
  });
});
