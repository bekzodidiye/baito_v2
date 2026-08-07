const fs = require('fs');
const turf = require('@turf/turf');

const regions = JSON.parse(fs.readFileSync('public/uzbekistan_regions_std.json', 'utf8'));
const districts = JSON.parse(fs.readFileSync('public/uzbekistan_districts.json', 'utf8'));

const romitan = districts.features.find(f => f.properties.shapeName === 'Romitan');
const buxoro = regions.features.find(f => f.properties.ADM1_EN === 'Buxoro');

console.log('Romitan original area:', turf.area(romitan) / 1000000);

try {
  const clipped = turf.intersect(turf.featureCollection([romitan, buxoro]));
  if (clipped) {
    console.log('Clipped area:', turf.area(clipped) / 1000000);
  } else {
    console.log('No intersection!');
  }
} catch (e) {
  console.error('Intersection error:', e.message);
}
