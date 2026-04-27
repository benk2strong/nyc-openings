process.on('uncaughtException', (err) => {
  console.log('Error:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.log('Error:', err.message);
  process.exit(1);
});

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const TODAY = new Date().toISOString().split('T')[0];

const EXCLUDED_CATEGORIES = [
  'hotel', 'gas_station', 'park', 'bowling_alley', 'miniature_golf_course',
  'manufacturer', 'consultant', 'association_or_organization', 'tourist_attraction',
  'observation_deck', 'event_venue', 'movie_theater', 'sports_activity_location',
  'comedy_club', 'shopping_mall'
];

const MANHATTAN_BOUNDS = {
  minLat: 40.6829, maxLat: 40.8790,
  minLng: -74.0477, maxLng: -73.9067
};

async function validate() {
  const failures = [];

  console.log('=== NYC Openings — Validation Report ===\n');

  // 1. Total row count
  const { count: totalCount, error: e1 } = await supabase
    .from('places_nyc')
    .select('*', { count: 'exact', head: true });
  if (e1) throw new Error(e1.message);
  console.log(`Total rows: ${totalCount}`);

  // 2. Rows with today's pull_date
  const { count: todayCount, error: e2 } = await supabase
    .from('places_nyc')
    .select('*', { count: 'exact', head: true })
    .eq('pull_date', TODAY);
  if (e2) throw new Error(e2.message);
  console.log(`Rows with today's pull_date (${TODAY}): ${todayCount}`);

  // 3. Duplicate place_source_id
  const { data: allIds, error: e3 } = await supabase
    .from('places_nyc')
    .select('place_source_id')
    .limit(100000);
  if (e3) throw new Error(e3.message);
  const idCounts = {};
  for (const row of allIds) {
    idCounts[row.place_source_id] = (idCounts[row.place_source_id] || 0) + 1;
  }
  const dupeCount = Object.values(idCounts).filter(c => c > 1).length;
  console.log(`Duplicate place_source_id values: ${dupeCount}`);
  if (dupeCount > 0) failures.push(`${dupeCount} duplicate place_source_id values`);

  // 4. Empty required fields (text)
  for (const field of ['name', 'address', 'category']) {
    const { count: nullCount, error: en } = await supabase
      .from('places_nyc')
      .select('*', { count: 'exact', head: true })
      .is(field, null);
    if (en) throw new Error(en.message);

    const { count: emptyCount, error: ee } = await supabase
      .from('places_nyc')
      .select('*', { count: 'exact', head: true })
      .eq(field, '');
    if (ee) throw new Error(ee.message);

    const total = (nullCount || 0) + (emptyCount || 0);
    console.log(`Rows with empty ${field}: ${total}`);
    if (total > 0) failures.push(`${total} rows with empty ${field}`);
  }

  // 4b. Null-only check for numeric fields
  for (const field of ['latitude', 'longitude']) {
    const { count: nullCount, error: en } = await supabase
      .from('places_nyc')
      .select('*', { count: 'exact', head: true })
      .is(field, null);
    if (en) throw new Error(en.message);
    console.log(`Rows with null ${field}: ${nullCount}`);
    if (nullCount > 0) failures.push(`${nullCount} rows with null ${field}`);
  }

  // 5. Brooklyn/Bronx addresses
  const { count: outerBoroughCount, error: e5 } = await supabase
    .from('places_nyc')
    .select('*', { count: 'exact', head: true })
    .or('address.ilike.%Brooklyn%,address.ilike.%Bronx%');
  if (e5) throw new Error(e5.message);
  console.log(`Rows with Brooklyn/Bronx addresses: ${outerBoroughCount}`);
  if (outerBoroughCount > 0) failures.push(`${outerBoroughCount} rows with Brooklyn/Bronx addresses`);

  // 6. Excluded categories
  const { count: excludedCount, error: e6 } = await supabase
    .from('places_nyc')
    .select('*', { count: 'exact', head: true })
    .in('category', EXCLUDED_CATEGORIES);
  if (e6) throw new Error(e6.message);
  console.log(`Rows with excluded categories: ${excludedCount}`);
  if (excludedCount > 0) failures.push(`${excludedCount} rows with excluded categories`);

  // 7. Top 10 categories
  const { data: catRows, error: e7 } = await supabase
    .from('places_nyc')
    .select('category')
    .limit(100000);
  if (e7) throw new Error(e7.message);
  const catCounts = {};
  for (const row of catRows) {
    const cat = row.category || '(empty)';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nTop 10 categories:');
  for (const [cat, count] of topCats) {
    console.log(`  ${cat}: ${count}`);
  }

  // 8. Geographic bounds
  const { data: maxLatRow, error: e8a } = await supabase
    .from('places_nyc').select('latitude').not('latitude', 'is', null)
    .order('latitude', { ascending: false }).limit(1);
  if (e8a) throw new Error(e8a.message);

  const { data: minLatRow, error: e8b } = await supabase
    .from('places_nyc').select('latitude').not('latitude', 'is', null)
    .order('latitude', { ascending: true }).limit(1);
  if (e8b) throw new Error(e8b.message);

  const { data: maxLngRow, error: e8c } = await supabase
    .from('places_nyc').select('longitude').not('longitude', 'is', null)
    .order('longitude', { ascending: false }).limit(1);
  if (e8c) throw new Error(e8c.message);

  const { data: minLngRow, error: e8d } = await supabase
    .from('places_nyc').select('longitude').not('longitude', 'is', null)
    .order('longitude', { ascending: true }).limit(1);
  if (e8d) throw new Error(e8d.message);

  const maxLat = maxLatRow[0]?.latitude;
  const minLat = minLatRow[0]?.latitude;
  const maxLng = maxLngRow[0]?.longitude;
  const minLng = minLngRow[0]?.longitude;

  console.log('\nGeographic bounds:');
  console.log(`  Latitude:  ${minLat} – ${maxLat}  (Manhattan: ${MANHATTAN_BOUNDS.minLat}–${MANHATTAN_BOUNDS.maxLat})`);
  console.log(`  Longitude: ${minLng} – ${maxLng}  (Manhattan: ${MANHATTAN_BOUNDS.minLng}–${MANHATTAN_BOUNDS.maxLng})`);

  const boundsOk =
    minLat >= MANHATTAN_BOUNDS.minLat && maxLat <= MANHATTAN_BOUNDS.maxLat &&
    minLng >= MANHATTAN_BOUNDS.minLng && maxLng <= MANHATTAN_BOUNDS.maxLng;
  if (!boundsOk) {
    console.log('  WARNING: some coordinates fall outside Manhattan bounding box');
    failures.push('coordinates outside Manhattan bounding box');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  if (failures.length === 0) {
    console.log('PASS — all checks passed');
    process.exit(0);
  } else {
    console.log('FAIL — the following checks failed:');
    for (const f of failures) console.log(`  x ${f}`);
    process.exit(1);
  }
}

validate();
