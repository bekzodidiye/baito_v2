import { UZBEKISTAN_REGIONS } from './mapConstants';



export const mapFeatureToRegionId = (adm1En: string): string => {
  if (!adm1En) return "";
  
  // The new GeoJSON already provides exact IDs like "Andijon", "Farg'ona"
  const exactMatch = UZBEKISTAN_REGIONS.find(r => r.id === adm1En);
  if (exactMatch) return exactMatch.id;

  // Fallback for old geojson or English names just in case
  const name = adm1En.toLowerCase();
  if (name.includes('karakalpakstan') || name.includes('qoraqalpog')) return "Qoraqalpog'iston";
  if (name.includes('khorezm') || name.includes('xorazm')) return "Xorazm";
  if (name.includes('navoi')) return "Navoiy";
  if (name.includes('bukhara') || name.includes('buxoro')) return "Buxoro";
  if (name.includes('samarkand') || name.includes('samarqand')) return "Samarqand";
  if (name.includes('kashkadarya') || name.includes('qashqadaryo')) return "Qashqadaryo";
  if (name.includes('surkhandarya') || name.includes('surxondaryo')) return "Surxondaryo";
  if (name.includes('jizzakh') || name.includes('jizzax')) return "Jizzax";
  if (name.includes('syrdarya') || name.includes('sirdaryo')) return "Sirdaryo";
  if (name.includes('tashkent') || name.includes('toshkent')) return "Toshkent";
  if (name.includes('namangan')) return "Namangan";
  if (name.includes('fergana') || name.includes('farg')) return "Farg'ona";
  if (name.includes('andijan') || name.includes('andijon')) return "Andijon";
  return "";
};

export const isRegionName = (locationName: string): boolean => {
  if (!locationName) return false;
  const lower = locationName.toLowerCase().trim();
  
  if (lower === 'barchasi') {
    return false;
  }

  // City or district designations are NOT regions (except the capital city "Toshkent shahri")
  if (
    (lower.includes('shahri') || lower.includes('city') || lower.endsWith(' sh.') || lower.includes(' sh. ')) && 
    !lower.includes('toshkent')
  ) {
    return false;
  }

  if (
    lower.includes('tumani') || 
    lower.includes('district') || 
    lower.includes('rayon') || 
    lower.endsWith(' t.') || 
    lower.includes(' t. ')
  ) {
    return false;
  }

  // Addresses containing commas (e.g. "Samarqand, Samarqand shahri") are not region names
  if (lower.includes(',')) {
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

