import { REGION_INFOS } from '../../data/regionInfos';
import { isRegionName } from './regionUtils';

export const calculateAreDistrictNamesEqual = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;

  // Extract district part if address format (e.g. "Samarqand, Samarqand shahri")
  const target1 = name1.includes(',') ? name1.split(',').pop()!.trim() : name1.trim();
  const target2 = name2.includes(',') ? name2.split(',').pop()!.trim() : name2.trim();

  if (!target1 || !target2) return false;
  if (target1.toLowerCase() === target2.toLowerCase()) return true;

  const isReg1 = isRegionName(target1);
  const isReg2 = isRegionName(target2);
  if ((isReg1 && !isReg2) || (!isReg1 && isReg2)) {
    return false;
  }

  const lower1 = target1.toLowerCase();
  const lower2 = target2.toLowerCase();
  
  const isRegion1 = lower1.includes('viloyati') || lower1.includes('respublikasi');
  const isRegion2 = lower2.includes('viloyati') || lower2.includes('respublikasi');
  
  const isCity1 = lower1.includes('shahri') || lower1.includes('city') || lower1.endsWith(' sh.') || lower1.includes(' sh. ');
  const isCity2 = lower2.includes('shahri') || lower2.includes('city') || lower2.endsWith(' sh.') || lower2.includes(' sh. ');
  
  const isDistrict1 = lower1.includes('tumani') || lower1.includes('district') || lower1.endsWith(' t.') || lower1.includes(' t. ');
  const isDistrict2 = lower2.includes('tumani') || lower2.includes('district') || lower2.endsWith(' t.') || lower2.includes(' t. ');

  if ((isRegion1 && (isCity2 || isDistrict2)) || (isRegion2 && (isCity1 || isDistrict1))) {
    return false;
  }
  
  if ((isCity1 && isDistrict2) || (isDistrict1 && isCity2)) {
    return false;
  }

  const cleanNormalize = (s: string) => {
    return s.toLowerCase()
      .replace(/tumani/g, '')
      .replace(/shahri/g, '')
      .replace(/city/g, '')
      .replace(/region/g, '')
      .replace(/viloyati/g, '')
      .replace(/rayon/g, '')
      .replace(/rayonli/g, '')
      .replace(/tumanli/g, '')
      .replace(/[\d\s']/g, '')
      .replace(/['’'`‘\s-]/g, '')
      .trim();
  };

  let dIndex1 = -1;
  let rInfo1: any = null;
  
  for (const r of REGION_INFOS) {
    const idxUz = r.districtsUz.findIndex(d => cleanNormalize(d) === cleanNormalize(name1) || cleanNormalize(name1).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name1)));
    if (idxUz !== -1) { dIndex1 = idxUz; rInfo1 = r; break; }

    const idxRu = r.districtsRu.findIndex(d => cleanNormalize(d) === cleanNormalize(name1) || cleanNormalize(name1).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name1)));
    if (idxRu !== -1) { dIndex1 = idxRu; rInfo1 = r; break; }

    const idxEn = r.districtsEn.findIndex(d => cleanNormalize(d) === cleanNormalize(name1) || cleanNormalize(name1).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name1)));
    if (idxEn !== -1) { dIndex1 = idxEn; rInfo1 = r; break; }
  }

  if (rInfo1 && dIndex1 !== -1) {
    const uzName = rInfo1.districtsUz[dIndex1];
    const ruName = rInfo1.districtsRu[dIndex1];
    const enName = rInfo1.districtsEn[dIndex1];

    const n2 = cleanNormalize(name2);
    if (
      n2 === cleanNormalize(uzName) ||
      n2 === cleanNormalize(ruName) ||
      n2 === cleanNormalize(enName) ||
      cleanNormalize(uzName).includes(n2) ||
      cleanNormalize(ruName).includes(n2) ||
      cleanNormalize(enName).includes(n2) ||
      n2.includes(cleanNormalize(uzName)) ||
      n2.includes(cleanNormalize(ruName)) ||
      n2.includes(cleanNormalize(enName))
    ) {
      return true;
    }
  }

  let dIndex2 = -1;
  let rInfo2: any = null;
  
  for (const r of REGION_INFOS) {
    const idxUz = r.districtsUz.findIndex(d => cleanNormalize(d) === cleanNormalize(name2) || cleanNormalize(name2).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name2)));
    if (idxUz !== -1) { dIndex2 = idxUz; rInfo2 = r; break; }

    const idxRu = r.districtsRu.findIndex(d => cleanNormalize(d) === cleanNormalize(name2) || cleanNormalize(name2).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name2)));
    if (idxRu !== -1) { dIndex2 = idxRu; rInfo2 = r; break; }

    const idxEn = r.districtsEn.findIndex(d => cleanNormalize(d) === cleanNormalize(name2) || cleanNormalize(name2).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name2)));
    if (idxEn !== -1) { dIndex2 = idxEn; rInfo2 = r; break; }
  }

  if (rInfo2 && dIndex2 !== -1) {
    const uzName = rInfo2.districtsUz[dIndex2];
    const ruName = rInfo2.districtsRu[dIndex2];
    const enName = rInfo2.districtsEn[dIndex2];

    const n1 = cleanNormalize(name1);
    if (
      n1 === cleanNormalize(uzName) ||
      n1 === cleanNormalize(ruName) ||
      n1 === cleanNormalize(enName) ||
      cleanNormalize(uzName).includes(n1) ||
      cleanNormalize(ruName).includes(n1) ||
      cleanNormalize(enName).includes(n1) ||
      n1.includes(cleanNormalize(uzName)) ||
      n1.includes(cleanNormalize(ruName)) ||
      n1.includes(cleanNormalize(enName))
    ) {
      return true;
    }
  }

  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/tumani/g, '')
      .replace(/shahri/g, '')
      .replace(/city/g, '')
      .replace(/region/g, '')
      .replace(/viloyati/g, '')
      .replace(/prov/g, '')
      .replace(/province/g, '')
      .replace(/['’'`‘\s-]/g, '')
      .replace(/o'/g, 'o')
      .replace(/g'/g, 'g')
      .replace(/sh/g, 's')
      .replace(/ch/g, 'c')
      .replace(/kh/g, 'x')
      .replace(/x/g, 'h')
      .replace(/q/g, 'k')
      .replace(/o/g, 'a')
      .trim();
  };

  const n1 = normalize(target1);
  const n2 = normalize(target2);
  
  return n1 === n2 || (n1.length >= 4 && n2.length >= 4 && (n1.startsWith(n2) || n2.startsWith(n1)));
};

