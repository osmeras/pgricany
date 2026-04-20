// fetch.mjs – spouští GitHub Actions, výsledek zapíše do data.json

import { writeFileSync } from 'fs';

const PILOTS = [
  'osmera',
  'lupinekm',
  'Zdenek.Moudry',
  'mnovak',
  'AfroFlyer',
  'Cibulka_J'
];

const API_KEY = 'F0632ED0D6E871BA-BB28D108B0B5AF96-26B427E2774DB191';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function getPilotId(username) {
  const resp = await fetch(`https://www.xcontest.org/cesko/piloti/detail:${username}`, { headers: HEADERS });
  const html = await resp.text();
  const m = html.match(/item\s*:\s*(\d+)/);
  return m ? m[1] : null;
}

async function fetchPilot(username) {
  try {
    // 1. Získej pilot ID ze stránky
    const pilotId = await getPilotId(username);
    if (!pilotId) return { username, error: 'Pilot nenalezen' };

    // 2. Zavolej API
    const url = `https://www.xcontest.org/api/data/?pilot/cpp&item=${pilotId}&volume=2026&key=${API_KEY}`;
    const resp = await fetch(url, { headers: HEADERS });
    const data = await resp.json();

    console.log(`[${username}] raw:`, JSON.stringify(data).substring(0, 300));

    if (data?.error) return { username, pilotId, error: data.error.message };

    // 3. Parsuj odpověď – vyzkoušíme různé formáty
    const p = data?.pilot ?? data?.data ?? data;
    const stats = p?.stats ?? p?.ranking ?? p?.season ?? p;

    return {
      username,
      pilotId,
      name:    p?.name ?? p?.firstname ? `${p.firstname} ${p.lastname}` : username,
      points:  stats?.points ?? stats?.pts ?? stats?.score ?? null,
      flights: stats?.flights ?? stats?.flight_count ?? null,
      km:      stats?.km ?? stats?.distance ?? stats?.dist ?? null,
      url:     `https://www.xcontest.org/cesko/piloti/detail:${username}`,
    };

  } catch (e) {
    return { username, error: e.message };
  }
}

const results = [];
for (const username of PILOTS) {
  const data = await fetchPilot(username);
  results.push(data);
  await new Promise(r => setTimeout(r, 500));
}

const output = {
  updated: new Date().toISOString(),
  pilots: results,
};

writeFileSync('data.json', JSON.stringify(output, null, 2));
console.log('\ndata.json uložen:', JSON.stringify(output, null, 2));
