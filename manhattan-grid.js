'use strict';

const path = require('path');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point } = require('@turf/helpers');

const manhattanGeoJSON = require(path.join(__dirname, 'manhattan-boundary.json'));
const manhattanFeature = manhattanGeoJSON.features[0];

// Bounding box for Manhattan
const LAT_MIN = 40.682917;
const LAT_MAX = 40.879038;
const LNG_MIN = -74.047730;
const LNG_MAX = -73.906651;

// 700m spacing: Δlat = 700/111320 ≈ 0.006298°, Δlng corrected for 40.78°N
const D_LAT = 0.006298;
const D_LNG = 0.008318;

const gridPoints = [];

for (let lat = LAT_MIN; lat <= LAT_MAX + D_LAT / 2; lat += D_LAT) {
  for (let lng = LNG_MIN; lng <= LNG_MAX + D_LNG / 2; lng += D_LNG) {
    const lat_ = Math.round(lat * 1e6) / 1e6;
    const lng_ = Math.round(lng * 1e6) / 1e6;
    const pt = point([lng_, lat_]);
    if (booleanPointInPolygon(pt, manhattanFeature)) {
      gridPoints.push({ lat: lat_, lng: lng_ });
    }
  }
}

console.log(`Manhattan grid: ${gridPoints.length} points loaded`);

module.exports = gridPoints;
