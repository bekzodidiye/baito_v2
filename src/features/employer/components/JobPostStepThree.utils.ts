declare global {
  interface Window {
    ymaps?: any;
  }
}

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lon: number;
}

const CYRILLIC_MAP: Record<string, string> = {
  'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v', 'Г': 'G', 'г': 'g',
  'Д': 'D', 'д': 'd', 'Е': 'E', 'е': 'e', 'Ё': 'Yo', 'ё': 'yo', 'Ж': 'Zh', 'ж': 'zh',
  'З': 'Z', 'з': 'z', 'И': 'I', 'и': 'i', 'Й': 'Y', 'й': 'y', 'К': 'K', 'к': 'k',
  'Л': 'L', 'л': 'l', 'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n', 'О': 'O', 'о': 'o',
  'П': 'P', 'п': 'p', 'Р': 'R', 'р': 'r', 'С': 'S', 'с': 's', 'Т': 'T', 'т': 't',
  'У': 'U', 'у': 'u', 'Ф': 'F', 'ф': 'f', 'Х': 'X', 'х': 'x', 'Ц': 'Ts', 'ц': 'ts',
  'Ч': 'Ch', 'ч': 'ch', 'Ш': 'Sh', 'ш': 'sh', 'Щ': 'Shch', 'щ': 'shch', 'Ъ': "'", 'ъ': "'",
  'Ы': 'I', 'ы': 'i', 'Ь': '', 'ь': '', 'Э': 'E', 'э': 'e', 'Ю': 'Yu', 'ю': 'yu',
  'Я': 'Ya', 'я': 'ya', 'Ў': "O'", 'ў': "o'", 'Қ': 'Q', 'қ': 'q', 'Ғ': "G'", 'ғ': "g'",
  'Ҳ': 'H', 'ҳ': 'h'
};

export const cyrillicToLatin = (str: string): string => {
  if (!str) return '';
  return str.replace(/[А-Яа-яЎўҚқҒғҲҳ]/g, char => CYRILLIC_MAP[char] || char);
};

export const formatUzbekAddress = (address: string): string => {
  if (!address) return '';
  let formatted = cyrillicToLatin(address);
  return formatted
    .replace(/(\d+)\s+School/gi, "$1-maktab").replace(/School/gi, "maktab")
    .replace(/(\d+)\s+Kindergarten/gi, "$1-bog'cha").replace(/Kindergarten/gi, "bog'cha")
    .replace(/street/gi, "ko'chasi").replace(/Street/gi, "ko'chasi")
    .replace(/avenue/gi, "shoh ko'chasi").replace(/Avenue/gi, "shoh ko'chasi")
    .replace(/district/gi, "tumani").replace(/District/gi, "tumani")
    .replace(/road/gi, "yo'li").replace(/Road/gi, "yo'li")
    .replace(/building/gi, "bino").replace(/Building/gi, "bino")
    .replace(/(\d+)-y\s+pr-d/gi, "$1-tor ko'chasi")
    .replace(/(\d+)-y\s+pereulok/gi, "$1-tor ko'chasi")
    .replace(/pr-d/gi, "tor ko'chasi")
    .replace(/\bulitsa\b/gi, "ko'chasi")
    .replace(/\bul\.\s/gi, "ko'chasi, ")
    .replace(/\bprospekt\b/gi, "shoh ko'chasi")
    .replace(/\bpr-t\b/gi, "shoh ko'chasi")
    .replace(/\bdom\b/gi, "uy")
    .replace(/\bd\.\s/gi, "uy, ")
    .replace(/Registan/gi, "Registon")
    // Fix cases where it becomes "Ibn Sino ko'chasi ko'chasi"
    .replace(/ko'chasi\s+ko'chasi/gi, "ko'chasi")
    .trim();
};

const NOISE = ['aksaray', 'oqsaroy', 'unnamed', 'unknown', 'undefined', 'null'];

export const formatStructuredAddress = (data: any): string => {
  if (!data) return '';
  const addr = data.address || {};
  const props = data.properties || {};

  const poiName = data.name || addr.amenity || addr.shop || addr.office || addr.tourism || addr.historic;
  const road = addr.road || props.street || addr.pedestrian || addr.street;
  const houseNum = addr.house_number || props.housenumber || addr.building || addr.house;
  const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential;

  const parts: string[] = [];
  if (poiName) {
    const cleanPoi = formatUzbekAddress(poiName);
    if (!NOISE.some(n => cleanPoi.toLowerCase().includes(n)) && !cleanPoi.match(/^(building|house|way|yes|no)$/i)) parts.push(cleanPoi);
  }
  if (road) {
    let st = formatUzbekAddress(road);
    if (houseNum) st += `, ${houseNum}`;
    if (!parts.some(p => p.toLowerCase().includes(st.toLowerCase()))) parts.push(st);
  }
  if (neighbourhood && parts.length < 2) {
    const cleanN = formatUzbekAddress(neighbourhood);
    if (!NOISE.some(n => cleanN.toLowerCase().includes(n)) && !parts.some(p => p.toLowerCase().includes(cleanN.toLowerCase()))) parts.push(cleanN);
  }
  if (parts.length === 0 && data.display_name) {
    return data.display_name.split(',').map((s: string) => formatUzbekAddress(s.trim())).filter((s: string) => !NOISE.some(n => s.toLowerCase().includes(n))).slice(0, 2).join(', ');
  }
  return parts.join(', ');
};

export const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  Toshkent: { lat: 41.3111, lon: 69.2406 }, Samarqand: { lat: 39.6542, lon: 66.9597 },
  Buxoro: { lat: 39.7747, lon: 64.4286 }, Andijon: { lat: 40.7821, lon: 72.3442 },
  "Farg'ona": { lat: 40.3842, lon: 71.7843 }, Namangan: { lat: 41.0011, lon: 71.6683 },
  Qarshi: { lat: 38.8606, lon: 65.7891 }, Urganch: { lat: 41.5503, lon: 60.6317 },
  Nukus: { lat: 42.4619, lon: 59.6166 }, Termiz: { lat: 37.2242, lon: 67.2783 },
  Jizzax: { lat: 40.1158, lon: 67.8422 }, Navoiy: { lat: 40.0844, lon: 65.3792 },
  Guliston: { lat: 40.4897, lon: 68.7842 },
};

export const POPULAR_DISTRICTS: Record<string, { label: string; lat: number; lon: number }[]> = {
  Toshkent: [
    { label: 'Yunusobod', lat: 41.3655, lon: 69.2897 }, { label: 'Chilonzor', lat: 41.2721, lon: 69.2045 },
    { label: "Mirzo Ulug'bek", lat: 41.3382, lon: 69.3341 }, { label: 'Yakkasaroy', lat: 41.2885, lon: 69.2561 },
    { label: 'Mirobod', lat: 41.2942, lon: 69.2783 }, { label: 'Shayxontohur', lat: 41.3211, lon: 69.2312 },
  ],
  Samarqand: [
    { label: 'Registon', lat: 39.6547, lon: 66.9757 }, { label: 'Daxbed', lat: 39.6612, lon: 66.9482 },
  ],
};

export const searchAddressSuggestions = async (query: string, city: string): Promise<AddressSuggestion[]> => {
  if (!query || query.trim().length < 2) return [];
  if (typeof window !== 'undefined' && window.ymaps) {
    try {
      const sugs = await new Promise<AddressSuggestion[] | null>((resolve) => {
        window.ymaps.ready(async () => {
          try {
            const items = await window.ymaps.suggest(`${query}, ${city}`);
            if (!items || !items.length) return resolve(null);
            resolve(items.slice(0, 5).map((item: any) => ({ displayName: cyrillicToLatin(item.title || item.value || ''), lat: 0, lon: 0 })));
          } catch (e) { resolve(null); }
        });
      });
      if (sugs && sugs.length) return sugs;
    } catch (e) {}
  }
  try {
    const cleanQ = query.replace(/,\s*\d+[a-zа-яA-ZА-Я]*$/gi, '').replace(/\s+\d+[a-zа-яA-ZА-Я]*$/gi, '').trim();
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${cleanQ || query}, ${city}, O'zbekiston`)}&limit=5&countrycodes=uz&addressdetails=1`, { headers: { 'Accept-Language': 'uz,en' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => ({ displayName: formatStructuredAddress(item), lat: parseFloat(item.lat), lon: parseFloat(item.lon) }));
  } catch (err) { return []; }
};

export const reverseGeocodeAddressFull = async (lat: number, lon: number): Promise<{ address: string; city?: string }> => {
  if (typeof window !== 'undefined' && window.ymaps) {
    try {
      const res = await new Promise<{ address: string; city?: string } | null>((resolve) => {
        window.ymaps.ready(async () => {
          try {
            const r = await window.ymaps.geocode([lat, lon], { results: 5 });
            
            let bestStreet = '';
            let bestHouse = '';
            let detectedCity = '';
            
            for (let i = 0; i < r.geoObjects.getLength(); i++) {
              const obj = r.geoObjects.get(i);
              const address = obj.properties.get('metaDataProperty.GeocoderMetaData.Address');
              if (address && address.Components) {
                const streetComp = address.Components.find((c: any) => c.kind === 'street');
                const houseComp = address.Components.find((c: any) => c.kind === 'house');
                const cityComp = address.Components.find((c: any) => c.kind === 'locality');
                
                if (streetComp && !bestStreet) bestStreet = streetComp.name;
                if (houseComp && !bestHouse) bestHouse = houseComp.name;
                if (cityComp && !detectedCity) detectedCity = cityComp.name;
              }
              if (bestStreet && bestHouse) break;
            }

            let formattedAddr = '';
            if (bestStreet && bestHouse) {
              formattedAddr = `${bestStreet}, ${bestHouse}`;
            } else if (bestStreet) {
              formattedAddr = bestStreet;
            } else {
              const obj = r.geoObjects.get(0);
              if (obj) {
                formattedAddr = obj.properties.get('name') || obj.getAddressLine() || '';
              }
            }

            let finalAddress = formatUzbekAddress(cyrillicToLatin(formattedAddr));
            
            let finalCity: string | undefined;
            if (detectedCity) {
              const latinLoc = cyrillicToLatin(detectedCity).toLowerCase();
              for (const c of Object.keys(CITY_COORDINATES)) { 
                if (latinLoc.includes(c.toLowerCase())) { finalCity = c; break; } 
              }
            }
            if (!finalCity) {
              const fullText = r.geoObjects.get(0)?.getAddressLine() || '';
              const latinFull = cyrillicToLatin(fullText).toLowerCase();
              for (const c of Object.keys(CITY_COORDINATES)) { 
                if (latinFull.includes(c.toLowerCase())) { finalCity = c; break; } 
              }
            }

            resolve({ address: finalAddress, city: finalCity });
          } catch (e) { resolve(null); }
        });
      });
      if (res && res.address) return res;
    } catch (e) {}
  }
  
  // Nominatim Fallback
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, { headers: { 'Accept-Language': 'uz,en' } });
    if (!res.ok) return { address: '' };
    const data = await res.json();
    if (!data) return { address: '' };
    
    const addrObj = data.address || {};
    const road = addrObj.road || addrObj.pedestrian || addrObj.street || '';
    const houseNum = addrObj.house_number || addrObj.building || addrObj.house || '';
    const neighbourhood = addrObj.neighbourhood || addrObj.suburb || addrObj.residential || '';
    
    let baseAddr = '';
    if (road && houseNum) {
      baseAddr = `${road}, ${houseNum}`;
    } else if (road) {
      baseAddr = road;
    } else if (neighbourhood) {
      baseAddr = neighbourhood;
    } else {
      baseAddr = formatStructuredAddress(data);
    }
    
    const latinAddress = formatUzbekAddress(cyrillicToLatin(baseAddr));

    let detectedCity: string | undefined;
    const latinLoc = cyrillicToLatin(`${addrObj.city || ''} ${addrObj.town || ''} ${addrObj.state || ''} ${data.display_name || ''}`).toLowerCase();
    for (const c of Object.keys(CITY_COORDINATES)) { if (latinLoc.includes(c.toLowerCase())) { detectedCity = c; break; } }
    return { address: latinAddress, city: detectedCity };
  } catch (err) { return { address: '' }; }
};
