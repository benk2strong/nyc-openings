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
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const daysBack = parseInt(process.argv[2] || '7', 10);

function getNeighborhood(lat) {
  if (lat < 40.710) return 'Financial District / Lower Manhattan';
  if (lat < 40.720) return 'Chinatown / Lower East Side';
  if (lat < 40.730) return 'East Village / West Village / SoHo';
  if (lat < 40.740) return 'Greenwich Village / NoHo / Union Square';
  if (lat < 40.750) return 'Murray Hill / Gramercy / Chelsea';
  if (lat < 40.760) return 'Midtown South / Herald Square';
  if (lat < 40.775) return 'Midtown / Times Square / Theater District';
  if (lat < 40.790) return 'Upper West Side / Upper East Side';
  if (lat < 40.810) return 'Morningside Heights / Manhattan Valley';
  if (lat < 40.835) return 'Harlem';
  if (lat < 40.855) return 'Washington Heights';
  return 'Inwood';
}

async function runDiff() {
  const today = new Date();
  const since = new Date(today);
  since.setDate(since.getDate() - daysBack);
  const sinceISO = since.toISOString();
  const runDate = today.toISOString().split('T')[0];

  console.log(`Run date: ${runDate}`);
  console.log(`Lookback: ${daysBack} days (since ${sinceISO.split('T')[0]})`);

  let allRows = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from('places_nyc')
        .select('name, address, latitude, longitude, category, phone, website, place_source_id, first_seen, pull_date')
        .gte('first_seen', sinceISO)
        .range(from, from + PAGE_SIZE - 1)
        .order('first_seen', { ascending: false });

      if (error) {
        console.log('Supabase query error:', error.message);
        process.exit(1);
      }

      allRows = allRows.concat(data || []);
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  } catch (err) {
    console.log('Error querying Supabase:', err.message);
    process.exit(1);
  }

  if (allRows.length === 0) {
    console.log(`No new openings found in the last ${daysBack} days.`);
    const output = {
      run_date: runDate,
      days_lookback: daysBack,
      total_new: 0,
      by_neighborhood: {},
      by_category: {}
    };
    try {
      fs.writeFileSync(path.join(__dirname, 'new-openings.json'), JSON.stringify(output, null, 2));
    } catch (err) {
      console.log('Error writing new-openings.json:', err.message);
      process.exit(1);
    }
    console.log('Wrote new-openings.json with total_new: 0');
    return;
  }

  const byNeighborhood = {};
  const byCategory = {};

  for (const row of allRows) {
    const neighborhood = getNeighborhood(row.latitude);
    if (!byNeighborhood[neighborhood]) byNeighborhood[neighborhood] = [];
    byNeighborhood[neighborhood].push({
      name: row.name,
      address: row.address,
      category: row.category,
      phone: row.phone,
      website: row.website,
      first_seen: row.first_seen
    });

    byCategory[row.category] = (byCategory[row.category] || 0) + 1;
  }

  const sortedByCategory = Object.fromEntries(
    Object.entries(byCategory).sort(([, a], [, b]) => b - a)
  );

  const output = {
    run_date: runDate,
    days_lookback: daysBack,
    total_new: allRows.length,
    by_neighborhood: byNeighborhood,
    by_category: sortedByCategory
  };

  try {
    fs.writeFileSync(path.join(__dirname, 'new-openings.json'), JSON.stringify(output, null, 2));
  } catch (err) {
    console.log('Error writing new-openings.json:', err.message);
    process.exit(1);
  }

  console.log(`\nTotal new openings: ${allRows.length}`);
  console.log('\nBy neighborhood:');
  for (const [neighborhood, places] of Object.entries(byNeighborhood)) {
    console.log(`  ${neighborhood}: ${places.length}`);
  }
  console.log('\nBy category:');
  for (const [category, count] of Object.entries(sortedByCategory)) {
    console.log(`  ${category}: ${count}`);
  }
  console.log('\nWrote new-openings.json');
}

runDiff();
