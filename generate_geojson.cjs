const fs = require('fs');
const turf = require('@turf/turf');

// Load GeoJSONs
const admin3 = JSON.parse(fs.readFileSync('/tmp/uzbekistan_admin3.geojson', 'utf8'));
const admin4 = JSON.parse(fs.readFileSync('/tmp/uzbekistan_admin4.geojson', 'utf8'));
const admin6 = JSON.parse(fs.readFileSync('/tmp/uzbekistan_admin6.geojson', 'utf8'));

// Region Mapping for Frontend
const regionMapping = {
  'Andijan Region': 'Andijon',
  'Namangan Region': 'Namangan',
  'Fergana Region': "Farg'ona",
  'Xorazm Region': 'Xorazm',
  'Navoiy Region': 'Navoiy',
  'Surxondaryo Region': 'Surxondaryo',
  'Samarqand Region': 'Samarqand',
  'Tashkent Region': 'Toshkent',
  'Tashkent': 'Toshkent', // Tashkent City
  'Sirdaryo Region': 'Sirdaryo',
  'Jizzakh Region': 'Jizzax',
  'Bukhara Region': 'Buxoro',
  'Qashqadaryo Region': 'Qashqadaryo',
  'Republic of Karakalpakstan': 'Qoraqalpog\'iston' // Admin 3
};

// 1. Process Regions
const validRegions = [];

function processRegionFeature(f) {
  if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) return;
  const nameEn = f.properties['name:en'] || f.properties['name'];
  if (!nameEn) return;

  if (regionMapping[nameEn]) {
    validRegions.push({
      ...f,
      properties: {
        ...f.properties,
        ADM1_EN: regionMapping[nameEn],
        isTashkentCity: nameEn === 'Tashkent'
      }
    });
  }
}

admin4.features.forEach(processRegionFeature);
if (admin3 && admin3.features) admin3.features.forEach(processRegionFeature);

const finalRegionsCollection = {
  type: "FeatureCollection",
  features: validRegions.map(r => {
    return {
      type: "Feature",
      geometry: r.geometry,
      properties: {
        ADM1_EN: r.properties.ADM1_EN,
        isTashkentCity: r.properties.isTashkentCity
      }
    }
  })
};

// 2. Process Districts
const validDistricts = [];
const ignoreNames = ['Poytaht Savdo Markazi', 'Matbuot'];
admin6.features.forEach(f => {
  if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) return;

  const rawName = f.properties['name:uz'] || f.properties['name'] || f.properties['name:en'];
  if (!rawName) return;

  let parentRegion = null;
  let maxArea = 0;

  for (const r of validRegions) {
    try {
      const intersection = turf.intersect(turf.featureCollection([f, r]));
      if (intersection) {
        const area = turf.area(intersection);
        if (area > maxArea) {
          maxArea = area;
          parentRegion = r;
        }
      }
    } catch(e) {}
  }
  
  if (!parentRegion) {
    const center = turf.pointOnFeature(f);
    for (const r of validRegions) {
      if (turf.booleanPointInPolygon(center, r)) {
        parentRegion = r;
        break;
      }
    }
  }

  if (parentRegion) {
    let shapeName = rawName.trim();
    
    // Do NOT strip "shahri" or "tumani" so we can distinguish Buxoro shahri and Buxoro tumani!
    if (ignoreNames.includes(shapeName)) return;

    validDistricts.push({
      type: "Feature",
      geometry: f.geometry,
      properties: {
        shapeName: shapeName,
        regionId: parentRegion.properties.ADM1_EN,
        isTashkentCity: parentRegion.properties.isTashkentCity
      }
    });
  }
});

// FIX BUKHARA POLYGONS (Peshku & Romitan shape issue)
let romitan = validDistricts.find(f => f.properties.shapeName.includes('Romitan') || f.properties.shapeName.includes('RÐ°mitan'));
let peshku = validDistricts.find(f => f.properties.shapeName.includes('Peshku'));

if (romitan && peshku && romitan.geometry.type === 'MultiPolygon') {
  let romitanKeep = [];
  let romitanGive = [];
  
  romitan.geometry.coordinates.forEach(coords => {
    const p = turf.polygon(coords);
    const area = turf.area(p) / 1000000;
    // The small southern part is ~863 sq km. The others are > 2000 and 449 (both far north/desert).
    if (area > 800 && area < 1000) {
       romitanKeep.push(coords);
    } else {
       romitanGive.push(coords);
    }
  });
  
  // Update Romitan
  if (romitanKeep.length === 1) {
    romitan.geometry = { type: 'Polygon', coordinates: romitanKeep[0] };
  } else if (romitanKeep.length > 1) {
    romitan.geometry = { type: 'MultiPolygon', coordinates: romitanKeep };
  }
  
  // Update Peshku
  let peshkuCoords = peshku.geometry.type === 'MultiPolygon' ? peshku.geometry.coordinates : [peshku.geometry.coordinates];
  peshkuCoords = peshkuCoords.concat(romitanGive);
  peshku.geometry = { type: 'MultiPolygon', coordinates: peshkuCoords };
}

const finalDistrictsCollection = {
  type: "FeatureCollection",
  features: validDistricts
};

fs.writeFileSync('public/uzbekistan_regions_std.json', JSON.stringify(finalRegionsCollection));
fs.writeFileSync('public/uzbekistan_districts.json', JSON.stringify(finalDistrictsCollection));

console.log(`Successfully generated regions (${finalRegionsCollection.features.length}) and districts (${finalDistrictsCollection.features.length})`);
