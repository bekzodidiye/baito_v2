import { useState, useCallback } from 'react';

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

export const useJobPostFormState = (initialCompany: string = '') => {
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState<JobPostFormData>(() => ({
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
  }));

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
