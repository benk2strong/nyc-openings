process.on('uncaughtException', (err) => {
  console.log('Error:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.log('Error:', err.message);
  process.exit(1);
});

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point } = require('@turf/helpers');
const gridPoints = require('./manhattan-grid.js');
const manhattanBoundary = require('./manhattan-boundary.json');
const manhattanFeature = manhattanBoundary.features[0];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const PROGRESS_FILE = path.join(__dirname, 'pull-progress.json');
const DELAY_MS = 2000;
const TOTAL = gridPoints.length;
const PULL_DATE = new Date().toISOString().split('T')[0];

const EXCLUDED_CATEGORIES = new Set([
  'hotel', 'gas_station', 'park', 'bowling_alley', 'miniature_golf_course',
  'manufacturer', 'consultant', 'association_or_organization', 'tourist_attraction',
  'observation_deck', 'event_venue', 'movie_theater', 'sports_activity_location',
  'comedy_club', 'shopping_mall'
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return new Set(data.completed || []);
  } catch {
    return new Set();
  }
}

function saveProgress(completed) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ completed: [...completed] }));
}

async function pullPoint(gridPoint, index, completed) {
  const { lat, lng } = gridPoint;
  console.log(`Pulling point ${index + 1} of ${TOTAL}... (${lat}, ${lng})`);

  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        includedTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'clothing_store', 'store', 'shopping_mall', 'beauty_salon', 'gym', 'meal_takeaway'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 500
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.internationalPhoneNumber,places.websiteUri'
        }
      }
    );

    const places = response.data.places || [];
    console.log(`  Found ${places.length} places`);

    for (const place of places) {
      const record = {
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
        category: place.primaryType || '',
        place_source_id: place.id,
        phone: place.internationalPhoneNumber || '',
        website: place.websiteUri || '',
        pull_date: PULL_DATE,
        last_seen: new Date().toISOString()
      };

      if (record.latitude === null || record.longitude === null || !booleanPointInPolygon(point([record.longitude, record.latitude]), manhattanFeature)) {
        console.log(`  Skipped ${record.name} — outside Manhattan boundary`);
        continue;
      }

      if (EXCLUDED_CATEGORIES.has(record.category)) {
        console.log(`  Skipped ${record.name} — excluded category: ${record.category}`);
        continue;
      }

      const { error } = await supabase
        .from('places_nyc')
        .upsert(record, { onConflict: 'place_source_id' });

      if (error) {
        console.log(`  Error saving ${record.name}:`, error.message);
      } else {
        console.log(`  Saved: ${record.name}`);
      }
    }
  } catch (err) {
    if (err.response) {
      console.log(`  API Error at point ${index + 1}:`, err.response.status, err.response.data);
    } else {
      console.log(`  Error at point ${index + 1}:`, err.message);
    }
  }

  completed.add(index);
  saveProgress(completed);
}

async function pullPlaces() {
  console.log(`Starting Manhattan grid pull — ${TOTAL} points, pull_date: ${PULL_DATE}`);

  const completed = loadProgress();
  if (completed.size > 0) {
    console.log(`Resuming: ${completed.size} points already completed, ${TOTAL - completed.size} remaining`);
  }

  for (let i = 0; i < TOTAL; i++) {
    if (completed.has(i)) {
      console.log(`Skipping point ${i + 1} of ${TOTAL} (already done)`);
      continue;
    }

    await pullPoint(gridPoints[i], i, completed);

    if (i < TOTAL - 1) {
      await sleep(DELAY_MS);
    }
  }

  fs.unlinkSync(PROGRESS_FILE);
  console.log('Done! Pull complete.');
}

pullPlaces();
