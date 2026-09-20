const fs = require('fs');
const topojson = require('topojson-client');
const us = require('us-atlas/states-albers-10m.json');
const d3Geo = require('d3-geo');

const path = d3Geo.geoPath(null);
const allStates = topojson.feature(us, us.objects.states).features;

const pacific = new Set(['Washington', 'Oregon', 'California', 'Nevada']);
const mountain = new Set(['Idaho', 'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona', 'New Mexico']);
const central = new Set(['North Dakota', 'South Dakota', 'Nebraska', 'Kansas', 'Oklahoma', 'Texas', 'Minnesota', 'Iowa', 'Missouri', 'Arkansas', 'Louisiana', 'Wisconsin', 'Illinois', 'Mississippi']);
const eastern = new Set(['Michigan', 'Indiana', 'Ohio', 'Kentucky', 'Tennessee', 'Alabama', 'Georgia', 'Florida', 'South Carolina', 'North Carolina', 'Virginia', 'West Virginia', 'Maryland', 'Delaware', 'District of Columbia', 'Pennsylvania', 'New Jersey', 'New York', 'Connecticut', 'Rhode Island', 'Massachusetts', 'Vermont', 'New Hampshire', 'Maine']);

// Collect continental states
const continentalPaths = [];
let alaskaPath = '';
let hawaiiPath = '';

allStates.forEach(s => {
  const name = s.properties.name;
  const d = path(s);
  if (!d) return;

  if (name === 'Alaska') {
    alaskaPath = d;
    return;
  }
  if (name === 'Hawaii') {
    hawaiiPath = d;
    return;
  }

  let region = 'central';
  let fill = '#174fa4';
  if (pacific.has(name)) {
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

  continentalPaths.push({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    region,
    fill,
    d,
  });
});

const fileContent = `/**
 * Geographically accurate production US State boundary paths
 * Derived from us-atlas / US Census Bureau Albers USA projection (10m resolution)
 * Matches approved PG-041 visual target
 */

export interface StateMapPath {
  id: string;
  name: string;
  region: 'pacific' | 'mountain' | 'central' | 'eastern';
  fill: string;
  d: string;
}

export const CONTINENTAL_TRANSFORM = "translate(85.6, 12.9) scale(0.8854, 0.7749)";

export const ALASKA_PATH = ${JSON.stringify(alaskaPath)};
export const ALASKA_TRANSFORM = "translate(87.8, 67.6) scale(0.65)";

export const HAWAII_PATH = ${JSON.stringify(hawaiiPath)};
export const HAWAII_TRANSFORM = "translate(54.0, -117.0) scale(1.00)";

export const REGION_COLORS = {
  pacific: '#1555a9',
  mountain: '#08405a',
  central: '#174fa4',
  eastern: '#3e469e',
} as const;

export const STATE_PATHS: StateMapPath[] = ${JSON.stringify(continentalPaths, null, 2)};
`;

fs.writeFileSync('client/src/components/national-coverage/usMapData.ts', fileContent);
console.log('Successfully generated usMapData.ts with', continentalPaths.length, 'continental states!');
