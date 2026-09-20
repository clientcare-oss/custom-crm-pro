const fs = require('fs');
const topojson = require('topojson-client');
const unprojectedUs = require('us-atlas/states-10m.json');
const d3Geo = require('d3-geo');

const states = topojson.feature(unprojectedUs, unprojectedUs.objects.states).features;
const width = 1024;
const height = 551;
const proj = d3Geo.geoAlbersUsa().fitExtent([[24, 20], [1000, 525]], topojson.feature(unprojectedUs, unprojectedUs.objects.states));
const pathGen = d3Geo.geoPath(proj);

const pacific = new Set(['Washington', 'Oregon', 'California', 'Nevada']);
const mountain = new Set(['Idaho', 'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona', 'New Mexico']);
const central = new Set(['North Dakota', 'South Dakota', 'Nebraska', 'Kansas', 'Oklahoma', 'Texas', 'Minnesota', 'Iowa', 'Missouri', 'Arkansas', 'Louisiana', 'Wisconsin', 'Illinois', 'Mississippi']);
const eastern = new Set(['Michigan', 'Indiana', 'Ohio', 'Kentucky', 'Tennessee', 'Alabama', 'Georgia', 'Florida', 'South Carolina', 'North Carolina', 'Virginia', 'West Virginia', 'Maryland', 'Delaware', 'District of Columbia', 'Pennsylvania', 'New Jersey', 'New York', 'Connecticut', 'Rhode Island', 'Massachusetts', 'Vermont', 'New Hampshire', 'Maine']);

const statePaths = [];

states.forEach(s => {
  const name = s.properties.name;
  if (!name) return;
  const d = pathGen(s);
  if (!d) return;

  let region = 'central';
  let fill = '#174fa4';
  if (pacific.has(name) || name === 'Alaska' || name === 'Hawaii') {
    region = 'pacific';
    fill = '#1555a9';
  } else if (mountain.has(name)) {
    region = 'mountain';
    fill = '#08405a';
  } else if (central.has(name)) {
    region = 'central';
    fill = '#174fa4';
  } else if (eastern.has(name)) {
    region = 'eastern';
    fill = '#3e469e';
  }

  const bounds = pathGen.bounds(s);

  statePaths.push({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    fips: String(s.id),
    name,
    region,
    fill,
    d,
    bounds: [[Math.round(bounds[0][0]*10)/10, Math.round(bounds[0][1]*10)/10], [Math.round(bounds[1][0]*10)/10, Math.round(bounds[1][1]*10)/10]]
  });
});

console.log('Total state paths generated:', statePaths.length);

const outContent = `/**
 * Unified Geographic Map Data for PG-041
 * Generated directly from US Census Bureau / us-atlas unprojected shapefiles
 * Projection: geoAlbersUsa() fitExtent([[24, 20], [1000, 525]]) in 1024x551 SVG canvas
 * States and markers share the exact same projection with ZERO matrix transforms.
 */

export interface StateGeography {
  id: string;
  fips: string;
  name: string;
  region: 'pacific' | 'mountain' | 'central' | 'eastern';
  fill: string;
  d: string;
  bounds: [[number, number], [number, number]];
}

export const MAP_WIDTH = 1024;
export const MAP_HEIGHT = 551;
export const PROJECTION_SCALE = ${proj.scale()};
export const PROJECTION_TRANSLATE: [number, number] = [${proj.translate()[0]}, ${proj.translate()[1]}];

export const UNIFIED_STATE_PATHS: StateGeography[] = ${JSON.stringify(statePaths, null, 2)};
`;

fs.writeFileSync('client/src/components/national-coverage/unifiedMapData.ts', outContent);
console.log('Successfully wrote client/src/components/national-coverage/unifiedMapData.ts!');
