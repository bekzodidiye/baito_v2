import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../api/queries', () => ({ uploadFileApi: vi.fn() }));

import { ProfileDialogs } from './ProfileDialogs';
import { getProfileTranslations } from './ProfileScreen.utils';

afterEach(cleanup);

const EMPTY_FORM = {
  firstName: '', lastName: '', phone: '', email: '',
  birthDay: '', birthMonth: '', birthYear: '', gender: '',
  region: '', profession: '', aboutMe: '', skills: '',
  passportSeries: '', passportNumber: '', pinfl: '',
  docFileName1: '', docFileName2: '', profileImage: null,
};

const openIn = (language: 'uz' | 'ru' | 'en') => {
  render(
    <ProfileDialogs
      activeDialog="edit"
      setActiveDialog={vi.fn()}
      t={getProfileTranslations(language)}
      language={language}
      withdrawAmount=""
      setWithdrawAmount={vi.fn()}
      withdrawSuccess={false}
      handleWithdrawSubmit={vi.fn()}
      editForm={EMPTY_FORM}
      setEditForm={vi.fn()}
      handleSaveProfileSubmit={vi.fn()}
      isEditing={false}
    />,
  );
};

/** The dialog's chrome came from `t` — "Редактировать профиль", "Отмена",
 *  "Сохранить" — while every field label beside it was written into the JSX in
 *  Uzbek. A Russian reader got a Russian frame around an Uzbek form: ISM,
 *  FAMILIYA, TUG'ILGAN SANA, JINSI, KASB (MUTAXASSISLIK). */
describe('ProfileDialogs — the form is in the same language as its buttons', () => {
  const uzbekOnly = [
    'Ism *', 'Familiya *', "Tug'ilgan sana *", 'Jinsi *', 'Erkak', 'Ayol',
    'Manzil (Viloyat) *', 'Kasb (Mutaxassislik) *', "O'zim haqimda *",
    "Ko'nikmalar (vergul bilan) *", 'PROFIL RASM (IXTIYORIY)',
  ];

  it('leaves no Uzbek label in the Russian form', () => {
    openIn('ru');
    for (const label of uzbekOnly) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('labels the Russian form in Russian', () => {
    openIn('ru');
    for (const label of ['Имя *', 'Фамилия *', 'Дата рождения *', 'Пол *',
                         'Мужчина', 'Женщина', 'О себе *']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('leaves no Uzbek label in the English form', () => {
    openIn('en');
    for (const label of uzbekOnly) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.getByText('Date of birth *')).toBeTruthy();
  });

  it('still labels the Uzbek form in Uzbek', () => {
    openIn('uz');
    for (const label of uzbekOnly) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('translates the skills hint rather than showing an Uzbek example', () => {
    openIn('ru');
    expect(screen.getByPlaceholderText('Например: Быстрый, Ответственный')).toBeTruthy();
  });
});
