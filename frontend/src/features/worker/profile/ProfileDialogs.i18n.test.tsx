import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../api/queries', () => ({ uploadFileApi: vi.fn() }));

import { ProfileDialogs } from './ProfileDialogs';
import { getProfileTranslations } from './ProfileScreen.utils';

afterEach(cleanup);

const EMPTY_FORM = {
  firstName: '', lastName: '', phone: '', email: '',
  birthDay: '', birthMonth: '', birthYear: '', gender: '',
  region: '', profession: '', bankCard: '', aboutMe: '', skills: '',
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

/** Where the worker is paid.
 *
 *  `bankCardMask` was read in three admin places — the user detail, the payouts
 *  table, the finance list — and written by none, because no screen ever asked
 *  for it. Every worker showed "Kiritilmagan" and every payout row "—", so an
 *  administrator making the transfer by hand had nowhere to read the number.
 */
describe('the payout card field', () => {
  const withCard = (bankCard: string, language: 'uz' | 'ru' | 'en' = 'ru') => {
    const setEditForm = vi.fn();
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
        editForm={{ ...EMPTY_FORM, bankCard }}
        setEditForm={setEditForm}
        handleSaveProfileSubmit={vi.fn()}
        isEditing={false}
      />,
    );
    return { setEditForm, input: document.getElementById('input-bank-card') as HTMLInputElement };
  };

  it('is on the form at all', () => {
    const { input } = withCard('');
    expect(input).not.toBeNull();
  });

  it('reads back in groups of four', () => {
    const { input } = withCard('8600123456789012');
    expect(input.value).toBe('8600 1234 5678 9012');
  });

  it('names the scheme once it can tell', () => {
    cleanup();
    withCard('9860123456789012');
    expect(document.body.textContent).toContain('Humo');
    cleanup();
    withCard('8600123456789012');
    expect(document.body.textContent).toContain('UzCard');
  });

  it('says what is wrong, and marks the field invalid', () => {
    const { input } = withCard('4276123456789012');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.textContent).toMatch(/UzCard.*Humo|Humo.*UzCard/);
  });

  it('treats an empty field as fine, not as an error', () => {
    // A worker who has not been paid yet has no reason to fill it in.
    const { input } = withCard('');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('labels itself in the reader’s language', () => {
    for (const [lang, said] of [['ru', 'Банковская карта'], ['en', 'Bank card'],
                                ['uz', 'Bank kartasi']] as const) {
      cleanup();
      withCard('', lang);
      expect(document.body.textContent, lang).toContain(said);
    }
  });
});
