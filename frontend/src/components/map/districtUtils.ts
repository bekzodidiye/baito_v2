import { DISTRICT_MAP } from '../../data/districtMap';

const districtMatchCache = new Map<string, boolean>();


export const areDistrictNamesEqual = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;

  const key = `${name1}::${name2}`;
  if (districtMatchCache.has(key)) {
    return districtMatchCache.get(key)!;
  }

  const revKey = `${name2}::${name1}`;
  if (districtMatchCache.has(revKey)) {
    return districtMatchCache.get(revKey)!;
  }

  const result = calculateAreDistrictNamesEqual(name1, name2);
  if (districtMatchCache.size < 2000) {
    districtMatchCache.set(key, result);
  }
  return result;
};

import { calculateAreDistrictNamesEqual } from './districtMatchUtils';

export const formatDistrictName = (name: string): string => {
  if (!name) return "";
  const trimmed = name.trim();
  
  if (DISTRICT_MAP[trimmed]) {
    return DISTRICT_MAP[trimmed];
  }
  
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(DISTRICT_MAP)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }
  
  let clean = trimmed;
  if (clean.toLowerCase().endsWith(' city')) {
    clean = clean.substring(0, clean.length - 5) + ' shahri';
  } else if (!clean.toLowerCase().includes('tumani') && !clean.toLowerCase().includes('shahri')) {
    clean = clean + ' tumani';
  }
  return clean;
};
