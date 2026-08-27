import { DISTRICT_MAP } from '../../data/districtMap';
import { REGION_INFOS } from '../../data/regionInfos';

const districtMatchCache = new Map<string, boolean>();

export const getDistrictColor = (name: string): string => {
  const clean = name.toLowerCase().replace(/['`’‘-]/g, '').trim();
  if (clean.includes('peshku')) return '#b91c1c';
  if (clean.includes('romitan')) return '#15803d';
  if (clean.includes('shofirkon')) return '#1d4ed8';
  if (clean.includes('gijduvon') || clean.includes('g\'ijduvon')) return '#c2410c';
  if (clean.includes('jondor')) return '#0f766e';
  if (clean.includes('qorakol') || clean.includes('qorako\'l')) return '#7e22ce';
  if (clean.includes('olot')) return '#991b1b';
  if (clean.includes('qorovulbozor')) return '#0369a1';
  if (clean.includes('vobkent')) return '#047857';
  if (clean.includes('kogon')) return '#be185d';
  if (clean.includes('buxoro') || clean.includes('bukhara')) return '#4338ca';
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', 
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#d946ef', '#ec4899', '#14b8a6', '#84cc16'
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

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
