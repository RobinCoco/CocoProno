// api/sync-scores.js — Vercel Serverless Function
// Récupère les scores terminés depuis football-data.org et les pousse dans Supabase
// Appelé toutes les 5 min par cron-job.org pendant les matchs

const FDAPI_KEY  = process.env.FOOTBALL_DATA_API_KEY;
const SB_URL     = "https://rlbkpjxsskmkbinmiedc.supabase.co/rest/v1";
const SB_KEY     = "sb_publishable_kyPdCTAuQL4L6LF1gcse2A_J3nWIS8f";
const CRON_SECRET = process.env.CRON_SECRET; // sécurise l'endpoint

// ─── Traduction noms anglais → français (nos données internes) ──────────────
const EN_TO_FR = {
  "United States": "États-Unis", "USA": "États-Unis",
  "Panama": "Panama",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  "Morocco": "Maroc",
  "Mexico": "Mexique",
  "Uruguay": "Uruguay",
  "South Africa": "Afrique du Sud",
  "Cameroon": "Cameroun",
  "Canada": "Canada",
  "Colombia": "Colombie",
  "Romania": "Roumanie",
  "Algeria": "Algérie",
  "France": "France",
  "Argentina": "Argentine",
  "Croatia": "Croatie",
  "Australia": "Australie",
  "Spain": "Espagne",
  "Brazil": "Brésil",
  "Switzerland": "Suisse",
  "Nigeria": "Nigeria",
  "England": "Angleterre",
  "Portugal": "Portugal",
  "Ecuador": "Équateur",
  "Senegal": "Sénégal",
  "Germany": "Allemagne",
  "Netherlands": "Pays-Bas",
  "Japan": "Japon",
  "Ghana": "Ghana",
  "Belgium": "Belgique",
  "Saudi Arabia": "Arabie Saoudite",
  "Egypt": "Égypte",
  "Venezuela": "Venezuela",
  "Italy": "Italie",
  "South Korea": "Corée du Sud", "Korea Republic": "Corée du Sud",
  "Chile": "Chili",
  "Tunisia": "Tunisie",
  "Denmark": "Danemark",
  "Iran": "Iran",
  "Paraguay": "Paraguay",
  "Costa Rica": "Costa Rica",
  "Serbia": "Serbie",
  "Ivory Coast": "Côte d'Ivoire",
  "Peru": "Pérou",
  "New Zealand": "Nouvelle-Zélande",
  "Poland": "Pologne",
  "Turkey": "Turquie",
  "Jamaica": "Jamaïque",
  "Qatar": "Qatar",
};

// ─── Reconstruction des matchs (identique à l'app React) ────────────────────
const GROUPS = {
  A: ["États-Unis","Panama","Bosnie-Herzégovine","Maroc"],
  B: ["Mexique","Uruguay","Afrique du Sud","Cameroun"],
  C: ["Canada","Colombie","Roumanie","Algérie"],
  D: ["France","Argentine","Croatie","Australie"],
  E: ["Espagne","Brésil","Suisse","Nigeria"],
  F: ["Angleterre","Portugal","Équateur","Sénégal"],
  G: ["Allemagne","Pays-Bas","Japon","Ghana"],
  H: ["Belgique","Arabie Saoudite","Égypte","Venezuela"],
  I: ["Italie","Corée du Sud","Chili","Tunisie"],
  J: ["Danemark","Iran","Paraguay","Costa Rica"],
  K: ["Serbie","Côte d'Ivoire","Pérou","Nouvelle-Zélande"],
  L: ["Pologne","Turquie","Jamaïque","Qatar"],
};

function generateMatches() {
  const matches = [];
  let id = 1;
  Object.entries(GROUPS).forEach(([g, teams]) => {
    [
      { md:1, pairs:[[0,1],[2,3]] },
      { md:2, pairs:[[0,2],[1,3]] },
      { md:3, pairs:[[0,3],[1,2]] },
    ].forEach(({ md, pairs }) => {
      pairs.forEach(([i, j]) => {
        matches.push({ id: id++, team1: teams[i], team2: teams[j] });
      });
    });
  });
  return matches;
}
const ALL_MATCHES = generateMatches();

// Trouve notre match ID à partir des noms d'équipes anglais
function findMatch(homeEn, awayEn) {
  const t1 = EN_TO_FR[homeEn] || homeEn;
  const t2 = EN_TO_FR[awayEn] || awayEn;
  const m = ALL_MATCHES.find(m =>
    (m.team1 === t1 && m.team2 === t2) ||
    (m.team1 === t2 && m.team2 === t1)
  );
  if (!m) return null;
  return { id: m.id, reversed: m.team1 === t2 };
}

// ─── Handler principal ───────────────────────────────────────────────────────
export default async function handler(req, res) {

  // 1. Vérification sécurité — seul cron-job.org avec le bon secret peut appeler
  if (req.headers["x-cron-secret"] !== CRON_SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    // 2. Récupère les matchs terminés des 2 derniers jours
    const today     = new Date();
    const yesterday = new Date(today - 2 * 86400000);
    const fmt = d => d.toISOString().split("T")[0];

    const fdRes = await fetch(
      `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${fmt(yesterday)}&dateTo=${fmt(today)}&status=FINISHED`,
      { headers: { "X-Auth-Token": FDAPI_KEY } }
    );

    if (!fdRes.ok) {
      const err = await fdRes.text();
      return res.status(502).json({ error: `football-data.org: ${err}` });
    }

    const { matches: fdMatches = [] } = await fdRes.json();

    // 3. Pour chaque match terminé, met à jour Supabase
    let updated = 0, skipped = 0;
    const notFound = [];

    for (const m of fdMatches) {
      const score = m.score?.fullTime;
      if (!score || score.home === null || score.away === null) { skipped++; continue; }

      const found = findMatch(m.homeTeam.name, m.awayTeam.name);
      if (!found) { notFound.push(`${m.homeTeam.name} vs ${m.awayTeam.name}`); continue; }

      const s1 = found.reversed ? score.away : score.home;
      const s2 = found.reversed ? score.home : score.away;

      const sbRes = await fetch(`${SB_URL}/real_scores`, {
        method:  "POST",
        headers: {
          "apikey":        SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "Content-Type":  "application/json",
          "Prefer":        "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ match_id: found.id, score1: s1, score2: s2 }),
      });

      sbRes.ok ? updated++ : skipped++;
    }

    // 4. Réponse
    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      processed: fdMatches.length,
      updated,
      skipped,
      notFound: notFound.length ? notFound : undefined,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
