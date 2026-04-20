import { writeFileSync } from 'fs';

const PILOTS = ['osmera','lupinekm','Zdenek.Moudry','mnovak','AfroFlyer','Cibulka_J'];
const API_KEY = 'F0632ED0D6E871BA-BB28D108B0B5AF96-26B427E2774DB191';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

async function getPilotId(username) {
  const resp = await fetch(`https://www.xcontest.org/cesko/piloti/detail:${username}`, { headers: HEADERS });
  const html = await resp.text();
  const m = html.match(/item\s*:\s*(\d+)/);
  return m ? m[1] : null;
}

async function fetchPilot(username) {
  try {
    const pilotId = await getPilotId(username);
    if (!pilotId) return { username, error: 'Pilot ID nenalezeno' };

    // Stáhni lety filtrované podle pilot ID
    const url = `https://www.xcontest.org/api/data/?flights/cpp&filter[pilot]=${pilotId}&list[num]=100&key=${API_KEY}`;
    const resp = await fetch(url, { headers: HEADERS });
    const data = await resp.json();

    // Prvního pilota vypiš celý pro ladění
    if (username === PILOTS[0]) {
      console.log('RAW RESPONSE:', JSON.stringify(data).substring(0, 1000));
    }

    if (data?.error) return { username, pilotId, error: data.error.message };

    // Najdi pole letů — zkusíme různé klíče
    const flights = data?.flights ?? data?.data ?? data?.items ?? data?.list ?? [];
    console.log(`[${username}] flights type: ${typeof flights}, isArray: ${Array.isArray(flights)}, keys: ${Object.keys(data).join(',')}`);

    if (!Array.isArray(flights) || flights.length === 0) {
      return { username, pilotId, points: 0, flights: 0, km: 0,
               url: `https://www.xcontest.org/cesko/piloti/detail:${username}` };
    }

    // Sečti body, km a počet letů
    let totalPoints = 0, totalKm = 0;
    let pilotName = username;

    for (const f of flights) {
      console.log(`  let sample:`, JSON.stringify(f).substring(0, 200));
      break; // jen první pro ladění
    }

    flights.forEach(f => {
      totalPoints += parseFloat(f.pts ?? f.points ?? f.score ?? f.scoreTotal ?? 0);
      totalKm     += parseFloat(f.distance ?? f.km ?? f.dist ?? f.scoreDistance ?? 0);
      if (!pilotName || pilotName === username) {
        pilotName = f.pilot?.name ?? f.pilotName ?? f.name ?? username;
      }
    });

    return {
      username, pilotId,
      name:    pilotName,
      points:  Math.round(totalPoints * 100) / 100,
      flights: flights.length,
      km:      Math.round(totalKm * 100) / 100,
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

writeFileSync('data.json', JSON.stringify({ updated: new Date().toISOString(), pilots: results }, null, 2));
console.log('\nHotovo:', results.map(p => `${p.username}: ${p.points ?? p.error}`).join(', '));
