const fs = require('fs');
const turf = require('@turf/turf');

const admin4 = JSON.parse(fs.readFileSync('/tmp/uzbekistan_admin4.geojson', 'utf8'));
const admin6 = JSON.parse(fs.readFileSync('/tmp/uzbekistan_admin6.geojson', 'utf8'));

const romitan = admin6.features.find(f => f.properties['name:uz'] === 'Romitan tumani' || f.properties.name === 'Romitan tumani');
const konimex = admin6.features.find(f => f.properties.name && f.properties.name.includes('Konimex'));

console.log("Romitan BBOX:", turf.bbox(romitan));
console.log("Konimex BBOX:", turf.bbox(konimex));
