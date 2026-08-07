import { UZBEKISTAN_REGIONS } from './mapConstants';

export const getRegionStats = (regionId: string) => {
  const cleanId = regionId.toLowerCase();
  if (cleanId.includes('buxoro') || cleanId.includes('buxara')) {
    return {
      total: 133,
      checked: 85,
      completed: 55,
      percent: 41
    };
  }
  if (cleanId.includes('toshkent') && !cleanId.includes('shahr')) {
    return {
      total: 203,
      checked: 130,
      completed: 83,
      percent: 41
    };
  }
  let total = 120;
  if (cleanId.includes('samarqand')) total = 185;
  else if (cleanId.includes('fargona')) total = 145;
  else if (cleanId.includes('andijon')) total = 110;
  else if (cleanId.includes('namangan')) total = 115;
  else if (cleanId.includes('qashqadaryo')) total = 135;
  else if (cleanId.includes('surxondaryo')) total = 95;
  else if (cleanId.includes('jizzax')) total = 75;
  else if (cleanId.includes('sirdaryo')) total = 50;
  else if (cleanId.includes('navoiy')) total = 65;
  else if (cleanId.includes('xorazm')) total = 85;
  else if (cleanId.includes('qoraqalpogiston')) total = 105;

  const completed = Math.round(total * 0.41);
  const checked = Math.round(total * 0.64);
  return {
    total,
    checked,
    completed,
    percent: 41
  };
};

export const mapFeatureToRegionId = (adm1En: string): string => {
  const name = adm1En.toLowerCase();
  if (name.includes('karakalpakstan')) return "Qoraqalpog'iston";
  if (name.includes('khorezm')) return "Xorazm";
  if (name.includes('navoi')) return "Navoiy";
  if (name.includes('bukhara')) return "Buxoro";
  if (name.includes('samarkand')) return "Samarqand";
  if (name.includes('kashkadarya')) return "Qashqadaryo";
  if (name.includes('surkhandarya')) return "Surxondaryo";
  if (name.includes('jizzakh')) return "Jizzax";
  if (name.includes('syrdarya')) return "Sirdaryo";
  if (name.includes('tashkent')) return "Toshkent";
  if (name.includes('namangan')) return "Namangan";
  if (name.includes('fergana')) return "Farg'ona";
  if (name.includes('andijan')) return "Andijon";
  return "";
};

export const isRegionName = (locationName: string): boolean => {
  if (!locationName) return false;
  const lower = locationName.toLowerCase();
  
  if (lower.includes('shahri') && !lower.includes('toshkent')) {
    return false;
  }
  
  return UZBEKISTAN_REGIONS.some(r => {
    const rId = r.id.toLowerCase();
    const rName = r.name.toLowerCase();
    return lower === rId || 
           lower === rName || 
           lower === `${rId} viloyati` || 
           (rId === 'toshkent' && lower === 'toshkent shahri') ||
           lower === `${rId} respublikasi` ||
           lower.replace(/['’'`‘]/g, '') === rId.replace(/['’'`‘]/g, '') ||
           lower.replace(/['’'`‘]/g, '') === rName.replace(/['’'`‘]/g, '') ||
           lower.replace(/['’'`‘]/g, '') === `${rId.replace(/['’'`‘]/g, '')} viloyati`;
  });
};
