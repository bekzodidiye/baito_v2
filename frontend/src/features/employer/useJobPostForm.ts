import { useState, useCallback, useEffect } from 'react';

export interface JobPostFormData {
  // Step 1: Basic Info
  title: string;
  category: string;
  company: string;
  imageUrl: string;
  responsibilities: string;
  description: string;
  tags: string[];

  // Step 2: Shift, Wage & Requirements
  neededWorkers: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
  hourlyRate: string;
  transportRate: string;
  requirements: string;
  importantNote: string;

  // Step 3: Location
  city: string;
  addressLine: string;
  coordinateX: number;
  coordinateY: number;
}

export const DRAFT_STORAGE_KEY = 'baito_job_post_draft';
export const STEP_STORAGE_KEY = 'baito_job_post_step';

export const loadSavedDraft = (): Partial<JobPostFormData> | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(DRAFT_STORAGE_KEY) : null)
      || (typeof localStorage !== 'undefined' ? localStorage.getItem(DRAFT_STORAGE_KEY) : null);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearSavedDraft = () => {
  try {
    if (typeof window !== 'undefined') {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        sessionStorage.removeItem(STEP_STORAGE_KEY);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem(STEP_STORAGE_KEY);
      }
      if (window.history && window.location) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('step')) {
          url.searchParams.delete('step');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  } catch {
    // ignore
  }
};

export const loadSavedStep = (): number => {
  try {
    if (typeof window === 'undefined') return 1;
    const params = new URLSearchParams(window.location.search);
    const urlStep = parseInt(params.get('step') || '', 10);
    if (urlStep >= 1 && urlStep <= 3) return urlStep;

    const raw = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STEP_STORAGE_KEY) : null)
      || (typeof localStorage !== 'undefined' ? localStorage.getItem(STEP_STORAGE_KEY) : null);
    const step = raw ? parseInt(raw, 10) : 1;
    return step >= 1 && step <= 3 ? step : 1;
  } catch {
    return 1;
  }
};

export const saveSavedStep = (step: number) => {
  try {
    if (typeof window !== 'undefined') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STEP_STORAGE_KEY, String(step));
      if (typeof localStorage !== 'undefined') localStorage.setItem(STEP_STORAGE_KEY, String(step));
      if (window.history && window.location) {
        const url = new URL(window.location.href);
        if (step > 1) {
          url.searchParams.set('step', String(step));
        } else {
          url.searchParams.delete('step');
        }
        window.history.replaceState({}, '', url.toString());
      }
    }
  } catch {
    // ignore
  }
};

export const useJobPostFormState = (initialCompany: string = '') => {
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getInitialData = (): JobPostFormData => {
    const defaultData: JobPostFormData = {
      title: '',
      category: 'retail',
      company: initialCompany,
      imageUrl: '',
      responsibilities: '',
      description: '',
      tags: ['#Tezkor', "#KunlikTo'lov"],
      neededWorkers: '1',
      workDate: getTodayDate(),
      startTime: '09:00',
      endTime: '18:00',
      durationLabel: '1 kunlik',
      hourlyRate: '',
      transportRate: '',
      requirements: '',
      importantNote: '',
      city: 'Toshkent',
      addressLine: '',
      coordinateX: 41.3111,
      coordinateY: 69.2406,
    };

    const saved = loadSavedDraft();
    if (!saved) return defaultData;

    return {
      ...defaultData,
      ...saved,
      company: saved.company || initialCompany,
    };
  };

  const [formData, setFormData] = useState<JobPostFormData>(getInitialData);

  // Auto-save draft whenever meaningful fields change
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const isModified =
        !!formData.title ||
        !!formData.responsibilities ||
        !!formData.hourlyRate ||
        !!formData.addressLine ||
        !!formData.imageUrl ||
        formData.category !== 'retail' ||
        formData.city !== 'Toshkent';

      if (isModified) {
        const json = JSON.stringify(formData);
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(DRAFT_STORAGE_KEY, json);
        if (typeof localStorage !== 'undefined') localStorage.setItem(DRAFT_STORAGE_KEY, json);
      }
    } catch {
      // ignore
    }
  }, [formData]);

  const updateField = useCallback(<K extends keyof JobPostFormData>(key: K, value: JobPostFormData[K]) => {
    setFormData(prev => prev[key] === value ? prev : { ...prev, [key]: value });
  }, []);

  // Step 1 referentially stable callbacks
  const setTitle = useCallback((val: string) => updateField('title', val), [updateField]);
  const setCategory = useCallback((val: string) => updateField('category', val), [updateField]);
  const setCompany = useCallback((val: string) => updateField('company', val), [updateField]);
  const setImageUrl = useCallback((val: string) => updateField('imageUrl', val), [updateField]);
  const setResponsibilities = useCallback((val: string) => updateField('responsibilities', val), [updateField]);
  const setDescription = useCallback((val: string) => updateField('description', val), [updateField]);
  const setTags = useCallback((tags: string[]) => updateField('tags', tags), [updateField]);

  // Step 2 referentially stable callbacks
  const setNeededWorkers = useCallback((val: string) => updateField('neededWorkers', val), [updateField]);
  const setWorkDate = useCallback((val: string) => updateField('workDate', val), [updateField]);
  const setStartTime = useCallback((val: string) => updateField('startTime', val), [updateField]);
  const setEndTime = useCallback((val: string) => updateField('endTime', val), [updateField]);
  const setDurationLabel = useCallback((val: string) => updateField('durationLabel', val), [updateField]);
  const setHourlyRate = useCallback((val: string) => updateField('hourlyRate', val), [updateField]);
  const setTransportRate = useCallback((val: string) => updateField('transportRate', val), [updateField]);
  const setRequirements = useCallback((val: string) => updateField('requirements', val), [updateField]);
  const setImportantNote = useCallback((val: string) => updateField('importantNote', val), [updateField]);

  // Step 3 referentially stable callbacks
  const setCity = useCallback((val: string) => updateField('city', val), [updateField]);
  const setAddressLine = useCallback((val: string) => updateField('addressLine', val), [updateField]);
  const setCoordinateX = useCallback((val: number) => updateField('coordinateX', val), [updateField]);
  const setCoordinateY = useCallback((val: number) => updateField('coordinateY', val), [updateField]);

  return {
    formData,
    setFormData,
    updateField,
    setTitle,
    setCategory,
    setCompany,
    setImageUrl,
    setResponsibilities,
    setDescription,
    setTags,
    setNeededWorkers,
    setWorkDate,
    setStartTime,
    setEndTime,
    setDurationLabel,
    setHourlyRate,
    setTransportRate,
    setRequirements,
    setImportantNote,
    setCity,
    setAddressLine,
    setCoordinateX,
    setCoordinateY,
  };
};
