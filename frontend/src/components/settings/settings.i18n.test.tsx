import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));
vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ currentScreen: 'guide', setCurrentScreen: vi.fn() }),
}));

import { ChangePasswordModal } from './ChangePasswordModal';
import { QollanmaScreen } from './QollanmaScreen';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

const openPasswordModal = () =>
  render(
    <ChangePasswordModal
      showPasswordModal
      setShowPasswordModal={vi.fn()}
      passData={{ current: '', newPass: '', confirm: '' }}
      setPassData={vi.fn()}
      passSuccess={false}
      handleChangePassword={vi.fn()}
    />,
  );

const body = () => document.body.textContent ?? '';

/** Neither screen read the language at all. The password dialog had no
 *  translation import in the file; the guide imported `t`, used it for the
 *  back button's label, and wrote all three steps into the JSX in Uzbek. */
describe('Change password — the dialog is in the reader’s language', () => {
  it('shows no Uzbek to a Russian reader', () => {
    openPasswordModal();
    for (const label of ["Parolni O'zgartirish", 'Joriy Parol', 'Yangi Parol',
                         'Yangi Parolni Tasdiqlang', 'Bekor qilish', 'Saqlash']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('labels the fields in Russian', () => {
    openPasswordModal();
    expect(screen.getByText('Смена пароля')).toBeTruthy();
    expect(screen.getByText('Текущий пароль')).toBeTruthy();
    expect(screen.getByText('Подтвердите новый пароль')).toBeTruthy();
  });

  it('labels them for a screen reader in the same language', () => {
    openPasswordModal();
    expect(screen.getByLabelText('Текущий пароль')).toBeTruthy();
    expect(screen.getByLabelText('Новый пароль')).toBeTruthy();
  });

  it('still reads in Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    openPasswordModal();
    expect(screen.getByText("Parolni o'zgartirish")).toBeTruthy();
    expect(screen.getByText('Joriy parol')).toBeTruthy();
  });
});

describe('Guide — all three steps follow the chosen language', () => {
  const uzbekOnly = [
    "Baito'ga xush kelibsiz!",
    "1. Profilingizni to'ldiring",
    '2. Ish qidiring',
    '3. Ariza topshiring',
  ];

  it('says nothing in Uzbek to a Russian reader', () => {
    render(<QollanmaScreen />);
    for (const line of uzbekOnly) {
      expect(screen.queryByText(line)).toBeNull();
    }
  });

  it('walks a Russian reader through the same three steps', () => {
    render(<QollanmaScreen />);
    expect(screen.getByText('Добро пожаловать в Baito!')).toBeTruthy();
    expect(screen.getByText('1. Заполните профиль')).toBeTruthy();
    expect(screen.getByText('2. Ищите работу')).toBeTruthy();
    expect(screen.getByText('3. Подайте заявку')).toBeTruthy();
  });

  it('and an English one', () => {
    language.current = 'en';
    render(<QollanmaScreen />);
    expect(screen.getByText('Welcome to Baito!')).toBeTruthy();
    expect(screen.getByText('3. Apply')).toBeTruthy();
    expect(body()).not.toContain('Ariza topshiring');
  });

  it('still reads in Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    render(<QollanmaScreen />);
    for (const line of uzbekOnly) {
      expect(screen.getByText(line)).toBeTruthy();
    }
  });

  it('filters by category when employer tab is selected', () => {
    language.current = 'uz';
    render(<QollanmaScreen />);
    const employerChip = screen.getByText('Ish beruvchilarga');
    fireEvent.click(employerChip);

    expect(screen.getByText("1. Kompaniya profilini ochish va Tasdiqlash")).toBeTruthy();
    expect(screen.getByText("2. E'lon (Vakansiya) joylashtirish")).toBeTruthy();
    expect(screen.queryByText("1. Profilingizni to'ldiring")).toBeNull();
  });

  it('filters steps through the search bar', () => {
    language.current = 'uz';
    render(<QollanmaScreen />);
    const searchInput = screen.getByPlaceholderText("Qo'llanma bo'yicha qidirish (masalan: ariza, to'lov, smena, karta)...");
    fireEvent.change(searchInput, { target: { value: 'hisob-kitob' } });

    expect(screen.getByText("Xavfsiz to'lov va hisob-kitob kafolati")).toBeTruthy();
    expect(screen.queryByText("1. Profilingizni to'ldiring")).toBeNull();
  });
});

