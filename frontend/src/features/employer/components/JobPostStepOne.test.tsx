import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { JobPostStepOne } from './JobPostStepOne';
import { CATEGORIES_LIST } from '../../../constants/categories';

afterEach(cleanup);

const categories = CATEGORIES_LIST.map(c => ({ id: c.id, label: c.labelUz }));

const renderStep = (over: Record<string, unknown> = {}) => {
  const setCategory = vi.fn();
  render(
    <JobPostStepOne
      language="uz"
      title="" setTitle={vi.fn()}
      category="retail" setCategory={setCategory}
      categories={categories}
      company="" setCompany={vi.fn()}
      responsibilities="" setResponsibilities={vi.fn()}
      description="" setDescription={vi.fn()}
      {...over}
    />,
  );
  return { setCategory };
};

/** The category used to be fourteen chips wrapped over four rows, which pushed
 *  the rest of the form off the screen. Only one can ever be chosen, so it is a
 *  select — the same control the city field on step three already uses. */
describe('JobPostStepOne — category is a select, not a wall of chips', () => {
  it('offers every category in one control', () => {
    renderStep();
    const select = screen.getByLabelText('Kategoriya') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.options).toHaveLength(categories.length);
  });

  it('shows the category the form is currently on', () => {
    renderStep({ category: 'construction' });
    expect((screen.getByLabelText('Kategoriya') as HTMLSelectElement).value).toBe('construction');
  });

  it('reports the id, not the label, when one is picked', () => {
    const { setCategory } = renderStep();
    fireEvent.change(screen.getByLabelText('Kategoriya'), { target: { value: 'logistics' } });
    expect(setCategory).toHaveBeenCalledWith('logistics');
  });

  it('leaves the tag chips alone — those are multi-select and stay chips', () => {
    renderStep();
    expect(screen.getByRole('button', { name: '#Tezkor' })).toBeTruthy();
  });
});
