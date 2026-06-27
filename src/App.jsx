import { useState, useEffect, useRef } from "react";

// ─── Supabase REST helpers (pas de lib externe) ─────────
const SB_URL = "https://rlbkpjxsskmkbinmiedc.supabase.co/rest/v1";
const SB_KEY = "sb_publishable_kyPdCTAuQL4L6LF1gcse2A_J3nWIS8f";
const sbH = () => ({
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
});

const sbSelect = async (table, qs = "") => {
  try {
    const PAGE = 1000;
    let all = [], from = 0;
    while (true) {
      const r = await fetch(
        `${SB_URL}/${table}?select=*${qs}&limit=${PAGE}&offset=${from}`,
        { headers: { ...sbH(), "Range-Unit":"items", "Range":`${from}-${from+PAGE-1}` } }
      );
      if (!r.ok) { console.warn(`sbSelect ${table} ${r.status}`); break; }
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break; // dernière page
      from += PAGE;
    }
    return all;
  } catch(e) {
    console.warn(`sbSelect ${table}:`, e.message);
    return [];
  }
};
const sbInsert = async (table, data) => {
  const r = await fetch(`${SB_URL}/${table}`, { method:"POST", headers: sbH(), body: JSON.stringify(data) });
  return r;
};
const sbUpsert = async (table, data) => {
  const r = await fetch(`${SB_URL}/${table}`, {
    method:"POST",
    headers: { ...sbH(), "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(data),
  });
  return r;
};

const PARROT_IMG = "/images/parrot.png";
const JUNGLE_IMG = "/images/jungle.webp";

const GROUPS = {
  A: ["🇲🇽 Mexique", "🇿🇦 Afrique du Sud", "🇰🇷 Corée du Sud", "🇨🇿 Tchéquie"],
  B: ["🇨🇦 Canada", "🇧🇦 Bosnie-Herzégovine", "🇶🇦 Qatar", "🇨🇭 Suisse"],
  C: ["🇧🇷 Brésil", "🇲🇦 Maroc", "🇭🇹 Haïti", "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Écosse"],
  D: ["🇺🇸 États-Unis", "🇵🇾 Paraguay", "🇦🇺 Australie", "🇹🇷 Turquie"],
  E: ["🇩🇪 Allemagne", "🇨🇼 Curaçao", "🇨🇮 Côte d'Ivoire", "🇪🇨 Équateur"],
  F: ["🇳🇱 Pays-Bas", "🇯🇵 Japon", "🇸🇪 Suède", "🇹🇳 Tunisie"],
  G: ["🇧🇪 Belgique", "🇪🇬 Égypte", "🇮🇷 Iran", "🇳🇿 Nouvelle-Zélande"],
  H: ["🇪🇸 Espagne", "🇨🇻 Cap-Vert", "🇸🇦 Arabie Saoudite", "🇺🇾 Uruguay"],
  I: ["🇫🇷 France", "🇸🇳 Sénégal", "🇮🇶 Irak", "🇳🇴 Norvège"],
  J: ["🇦🇷 Argentine", "🇩🇿 Algérie", "🇦🇹 Autriche", "🇯🇴 Jordanie"],
  K: ["🇵🇹 Portugal", "🇨🇩 RD Congo", "🇺🇿 Ouzbékistan", "🇨🇴 Colombie"],
  L: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", "🇭🇷 Croatie", "🇬🇭 Ghana", "🇵🇦 Panama"],
};

// ─── Calendrier réel CdM 2026 (heure française CEST) ─────────────────────────
// Sources vérifiées : Eurosport, UEFA, Flashscore, France24 (juin 2026)
const MATCH_SCHEDULE = {
  // ── Groupe A — Mexique(0) AfrSud(1) Corée(2) Tchéquie(3) ──────────────────
  1:{date:"11/06",time:"21:00"}, // J1p0 Mexique-AfrSud ✓
  2:{date:"12/06",time:"04:00"}, // J1p1 Corée-Tchéquie ✓
  3:{date:"19/06",time:"03:00"}, // J2p0 Mexique-Corée ✓
  4:{date:"18/06",time:"18:00"}, // J2p1 AfrSud-Tchéquie ✓
  5:{date:"25/06",time:"03:00"}, // J3p0 Mexique-Tchéquie ✓
  6:{date:"25/06",time:"03:00"}, // J3p1 AfrSud-Corée ✓
  // ── Groupe B — Canada(0) Bosnie(1) Qatar(2) Suisse(3) ─────────────────────
  7:{date:"12/06",time:"21:00"}, // J1p0 Canada-Bosnie ✓
  8:{date:"13/06",time:"21:00"}, // J1p1 Qatar-Suisse ✓
  9:{date:"19/06",time:"00:00"}, // J2p0 Canada-Qatar ✓ (nuit du 18 au 19/06)
 10:{date:"18/06",time:"21:00"}, // J2p1 Bosnie-Suisse ✓
 11:{date:"24/06",time:"21:00"}, // J3p0 Canada-Suisse ✓
 12:{date:"24/06",time:"21:00"}, // J3p1 Bosnie-Qatar ✓
  // ── Groupe C — Brésil(0) Maroc(1) Haïti(2) Écosse(3) ────────────────────
 13:{date:"14/06",time:"00:00"}, // J1p0 Brésil-Maroc ✓
 14:{date:"14/06",time:"03:00"}, // J1p1 Haïti-Écosse ✓
 15:{date:"20/06",time:"02:30"}, // J2p0 Brésil-Haïti ✓
 16:{date:"20/06",time:"00:00"}, // J2p1 Maroc-Écosse ✓
 17:{date:"25/06",time:"00:00"}, // J3p0 Brésil-Écosse ✓
 18:{date:"25/06",time:"00:00"}, // J3p1 Maroc-Haïti ✓
  // ── Groupe D — États-Unis(0) Paraguay(1) Australie(2) Turquie(3) ──────────
 19:{date:"13/06",time:"03:00"}, // J1p0 USA-Paraguay ✓
 20:{date:"14/06",time:"06:00"}, // J1p1 Australie-Turquie ✓
 21:{date:"19/06",time:"19:00"}, // J2p0 USA-Australie (approx)
 22:{date:"20/06",time:"05:00"}, // J2p1 Paraguay-Turquie ✓
 23:{date:"26/06",time:"04:00"}, // J3p0 USA-Turquie ✓ (Los Angeles, 4h)
 24:{date:"26/06",time:"04:00"}, // J3p1 Paraguay-Australie ✓
  // ── Groupe E — Allemagne(0) Curaçao(1) CIvoire(2) Équateur(3) ────────────
 25:{date:"14/06",time:"19:00"}, // J1p0 Allemagne-Curaçao ✓
 26:{date:"15/06",time:"01:00"}, // J1p1 CIvoire-Équateur ✓
 27:{date:"20/06",time:"22:00"}, // J2p0 Allemagne-CIvoire ✓
 28:{date:"21/06",time:"02:00"}, // J2p1 Curaçao-Équateur ✓
 29:{date:"25/06",time:"22:00"}, // J3p0 Allemagne-Équateur ✓
 30:{date:"25/06",time:"22:00"}, // J3p1 Curaçao-CIvoire ✓
  // ── Groupe F — Pays-Bas(0) Japon(1) Suède(2) Tunisie(3) ─────────────────
 31:{date:"14/06",time:"22:00"}, // J1p0 Pays-Bas-Japon ✓
 32:{date:"15/06",time:"04:00"}, // J1p1 Suède-Tunisie ✓
 33:{date:"20/06",time:"19:00"}, // J2p0 Pays-Bas-Suède ✓
 34:{date:"21/06",time:"06:00"}, // J2p1 Japon-Tunisie ✓
 35:{date:"26/06",time:"01:00"}, // J3p0 Pays-Bas-Tunisie ✓
 36:{date:"26/06",time:"01:00"}, // J3p1 Japon-Suède ✓
  // ── Groupe G — Belgique(0) Égypte(1) Iran(2) NvlZélande(3) ──────────────
 37:{date:"15/06",time:"21:00"}, // J1p0 Belgique-Égypte ✓ (était 14/06 ← CORRIGÉ)
 38:{date:"16/06",time:"03:00"}, // J1p1 Iran-NvlZélande ✓ (était 15/06 ← CORRIGÉ)
 39:{date:"21/06",time:"21:00"}, // J2p0 Belgique-Iran ✓
 40:{date:"22/06",time:"03:00"}, // J2p1 Égypte-NvlZélande ✓
 41:{date:"27/06",time:"05:00"}, // J3p0 Belgique-NvlZélande ✓ (Vancouver, 5h)
 42:{date:"27/06",time:"05:00"}, // J3p1 Égypte-Iran ✓
  // ── Groupe H — Espagne(0) CapVert(1) ArbSaoud(2) Uruguay(3) ─────────────
 43:{date:"15/06",time:"18:00"}, // J1p0 Espagne-CapVert ✓ (était 14/06 ← CORRIGÉ)
 44:{date:"16/06",time:"00:00"}, // J1p1 ArbSaoud-Uruguay ✓ (était 15/06 ← CORRIGÉ)
 45:{date:"21/06",time:"18:00"}, // J2p0 Espagne-ArbSaoud ✓
 46:{date:"22/06",time:"00:00"}, // J2p1 CapVert-Uruguay ✓
 47:{date:"27/06",time:"02:00"}, // J3p0 Espagne-Uruguay ✓
 48:{date:"27/06",time:"02:00"}, // J3p1 CapVert-ArbSaoud ✓
  // ── Groupe I — France(0) Sénégal(1) Irak(2) Norvège(3) ──────────────────
 49:{date:"16/06",time:"21:00"}, // J1p0 France-Sénégal ✓
 50:{date:"17/06",time:"00:00"}, // J1p1 Irak-Norvège ✓
 51:{date:"22/06",time:"23:00"}, // J2p0 France-Irak ✓
 52:{date:"23/06",time:"02:00"}, // J2p1 Sénégal-Norvège ✓
 53:{date:"26/06",time:"21:00"}, // J3p0 France-Norvège ✓
 54:{date:"26/06",time:"21:00"}, // J3p1 Sénégal-Irak ✓
  // ── Groupe J — Argentine(0) Algérie(1) Autriche(2) Jordanie(3) ───────────
 55:{date:"17/06",time:"03:00"}, // J1p0 Argentine-Algérie ✓
 56:{date:"17/06",time:"06:00"}, // J1p1 Autriche-Jordanie ✓
 57:{date:"22/06",time:"19:00"}, // J2p0 Argentine-Autriche ✓
 58:{date:"23/06",time:"05:00"}, // J2p1 Algérie-Jordanie ✓
 59:{date:"28/06",time:"04:00"}, // J3p0 Argentine-Jordanie ✓ (Dallas, 4h)
 60:{date:"28/06",time:"04:00"}, // J3p1 Algérie-Autriche ✓ (Kansas City, 4h)
  // ── Groupe K — Portugal(0) RDCongo(1) Ouzbékistan(2) Colombie(3) ─────────
 61:{date:"17/06",time:"19:00"}, // J1p0 Portugal-RDCongo ✓
 62:{date:"18/06",time:"04:00"}, // J1p1 Ouzbékistan-Colombie ✓
 63:{date:"23/06",time:"19:00"}, // J2p0 Portugal-Ouzbékistan ✓
 64:{date:"24/06",time:"04:00"}, // J2p1 RDCongo-Colombie ✓
 65:{date:"28/06",time:"01:30"}, // J3p0 Portugal-Colombie ✓
 66:{date:"28/06",time:"01:30"}, // J3p1 RDCongo-Ouzbékistan ✓
  // ── Groupe L — Angleterre(0) Croatie(1) Ghana(2) Panama(3) ──────────────
 67:{date:"17/06",time:"22:00"}, // J1p0 Angleterre-Croatie ✓
 68:{date:"18/06",time:"01:00"}, // J1p1 Ghana-Panama ✓
 69:{date:"23/06",time:"22:00"}, // J2p0 Angleterre-Ghana ✓
 70:{date:"24/06",time:"01:00"}, // J2p1 Croatie-Panama ✓
 71:{date:"27/06",time:"23:00"}, // J3p0 Angleterre-Panama ✓
 72:{date:"27/06",time:"23:00"}, // J3p1 Croatie-Ghana ✓
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
        const sched = MATCH_SCHEDULE[id] || { date:"30/06", time:"21:00" };
        matches.push({ id, group:`Groupe ${g}`, gKey:g, md, team1:teams[i], team2:teams[j], date:sched.date, time:sched.time });
        id++;
      });
    });
  });
  return matches;
}

const ALL_MATCHES = generateMatches();

// ─── Calcul automatique des qualifiés ────────────────────────────────────────
// Retourne { rank1, rank2, rank3 } par groupe + 8 meilleurs 3es selon FIFA 2026
function computeQualified(realScores) {
  const groupStandings = {};

  // Calcul classement de chaque groupe
  Object.entries(GROUPS).forEach(([g, teams]) => {
    const stats = {};
    teams.forEach(t => { stats[t] = { pts:0, gf:0, ga:0, gd:0, played:0, name:t }; });

    ALL_MATCHES.filter(m => m.gKey === g).forEach(m => {
      const r = realScores[m.id];
      if (!r) return;
      const { s1, s2 } = r;
      stats[m.team1].played++; stats[m.team2].played++;
      stats[m.team1].gf += s1; stats[m.team1].ga += s2; stats[m.team1].gd += s1-s2;
      stats[m.team2].gf += s2; stats[m.team2].ga += s1; stats[m.team2].gd += s2-s1;
      if (s1 > s2)      { stats[m.team1].pts += 3; }
      else if (s1 < s2) { stats[m.team2].pts += 3; }
      else              { stats[m.team1].pts += 1; stats[m.team2].pts += 1; }
    });

    const sorted = Object.values(stats).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
    );
    // Seulement si toutes les J3 sont jouées (6 matchs par groupe)
    const played = Object.values(stats).reduce((s, t) => s + t.played, 0);
    groupStandings[g] = { teams: sorted, complete: played >= 6 };
  });

  // 1ers et 2es directs
  const qualified = {};
  Object.entries(groupStandings).forEach(([g, { teams, complete }]) => {
    if (!complete) return;
    qualified[`1${g}`] = teams[0]?.name;
    qualified[`2${g}`] = teams[1]?.name;
    qualified[`3${g}`] = { ...teams[2], group: g };
  });

  // 8 meilleurs 3es — critères FIFA : pts → diff → buts
  const thirds = Object.values(groupStandings)
    .filter(gs => gs.complete && gs.teams[2])
    .map(gs => ({ ...gs.teams[2] }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8)
    .map(t => t.name);

  return { groupStandings, qualified, thirds };
}

// Grille officielle FIFA 2026 — source : coupedumonde2026.net
// Les "3e" sont assignés selon l'annexe C FIFA (dépend des groupes qualifiés)
const KO_SLOT_MAP = {
  // 32es — teams connues déjà renseignées dans team1/team2 de KNOCKOUT_MATCHES
  // Les slots auto pour les équipes encore inconnues :
  1001: { t1:"2A", t2:"2B" },
  1002: { t1:"1E", t2:"3e1" },   // 3e from A/B/C/D/F
  1003: { t1:"1F", t2:"2C" },
  1004: { t1:"1C", t2:"2F" },
  1005: { t1:"1I", t2:"3e2" },   // 3e from C/D/F/G/H
  1006: { t1:"2E", t2:"2I" },
  1007: { t1:"1A", t2:"3e3" },   // 3e from C/E/F/H/I
  1008: { t1:"1L", t2:"3e4" },   // 3e from E/H/I/J/K
  1009: { t1:"1D", t2:"3e5" },   // 3e from B/E/F/I/J
  1010: { t1:"1G", t2:"3e6" },   // 3e from A/E/H/I/J
  1011: { t1:"2K", t2:"2L" },
  1012: { t1:"1H", t2:"2J" },
  1013: { t1:"1B", t2:"3e7" },   // 3e from E/F/G/I/J
  1014: { t1:"1J", t2:"2H" },
  1015: { t1:"1K", t2:"3e8" },   // 3e from D/E/I/J/L
  1016: { t1:"2D", t2:"2G" },
  // 16es → vainqueurs des 32es (selon bracket officiel)
  1101: { t1:"W1001", t2:"W1003" }, // N°90 : Vainq(AfrSud/Can) vs Vainq(PBas/Mar)
  1102: { t1:"W1002", t2:"W1005" }, // N°89 : Vainq(All/3e)     vs Vainq(Fra/3e)
  1103: { t1:"W1004", t2:"W1006" }, // N°91 : Vainq(Bré/Jap)    vs Vainq(CIv/Nor)
  1104: { t1:"W1007", t2:"W1008" }, // N°92 : Vainq(Mex/3e)     vs Vainq(1L/3e)
  1105: { t1:"W1011", t2:"W1012" }, // N°93 : Vainq(2K/2L)      vs Vainq(1H/2J)
  1106: { t1:"W1009", t2:"W1010" }, // N°94 : Vainq(USA/3e)     vs Vainq(1G/3e)
  1107: { t1:"W1014", t2:"W1016" }, // N°95 : Vainq(Arg/2H)     vs Vainq(Aus/2G)
  1108: { t1:"W1013", t2:"W1015" }, // N°96 : Vainq(Sui/3e)     vs Vainq(1K/3e)
  // Quarts → vainqueurs des 16es
  1201: { t1:"W1102", t2:"W1101" }, // N°97
  1202: { t1:"W1105", t2:"W1106" }, // N°98
  1203: { t1:"W1103", t2:"W1104" }, // N°99
  1204: { t1:"W1107", t2:"W1108" }, // N°100
  // Demi-finales
  1301: { t1:"W1201", t2:"W1202" }, // N°101
  1302: { t1:"W1203", t2:"W1204" }, // N°102
  // Petite finale
  1401: { t1:"L1301", t2:"L1302" }, // N°103
  // Finale
  1402: { t1:"W1301", t2:"W1302" }, // N°104
};


// ─── Phase finale ─────────────────────────────────────
// Format officiel FIFA 2026 — 32es (16m) → 16es (8m) → QF (4m) → SF (2m) → 3P → F
// Source : coupedumonde2026.net (26/06/2026) — heures heure de Paris
// N° FIFA : 73-88 (32es), 89-96 (16es), 97-100 (QF), 101-102 (SF), 103 (3P), 104 (F)
const KNOCKOUT_MATCHES = [
  // ── 32es de finale ────────────────────────────────────────────────────────
  { id:1001, round:"32es de finale", roundShort:"S1",  team1:"🇿🇦 Afrique du Sud",  team2:"🇨🇦 Canada",             date:"28/06", time:"21:00" }, // N°73 ✓
  { id:1002, round:"32es de finale", roundShort:"S2",  team1:"🇩🇪 Allemagne",        team2:"🇵🇾 Paraguay",            date:"29/06", time:"22:30" }, // N°74 ✓ (Paraguay = 3e D)
  { id:1003, round:"32es de finale", roundShort:"S3",  team1:"🇳🇱 Pays-Bas",         team2:"🇲🇦 Maroc",              date:"30/06", time:"03:00" }, // N°75 ✓
  { id:1004, round:"32es de finale", roundShort:"S4",  team1:"🇧🇷 Brésil",           team2:"🇯🇵 Japon",              date:"29/06", time:"19:00" }, // N°76 ✓
  { id:1005, round:"32es de finale", roundShort:"S5",  team1:"🇫🇷 France",           team2:"🇸🇪 Suède",              date:"30/06", time:"23:00" }, // N°77 ✓ (Suède = 3e F)
  { id:1006, round:"32es de finale", roundShort:"S6",  team1:"🇨🇮 Côte d'Ivoire",   team2:"🇳🇴 Norvège",            date:"30/06", time:"19:00" }, // N°78 ✓
  { id:1007, round:"32es de finale", roundShort:"S7",  team1:"🇲🇽 Mexique",          team2:"",     date:"01/07", time:"03:00" }, // N°79
  { id:1008, round:"32es de finale", roundShort:"S8",  team1:"",                     team2:"",     date:"01/07", time:"18:00" }, // N°80
  { id:1009, round:"32es de finale", roundShort:"S9",  team1:"🇺🇸 États-Unis",       team2:"🇧🇦 Bosnie-Herzégovine", date:"02/07", time:"02:00" }, // N°81 ✓
  { id:1010, round:"32es de finale", roundShort:"S10", team1:"🇧🇪 Belgique",         team2:"",     date:"01/07", time:"22:00" }, // N°82 ✓ (Belgique = 1er G)
  { id:1011, round:"32es de finale", roundShort:"S11", team1:"",                     team2:"",               date:"03/07", time:"01:00" }, // N°83
  { id:1012, round:"32es de finale", roundShort:"S12", team1:"🇪🇸 Espagne",          team2:"",               date:"02/07", time:"21:00" }, // N°84 ✓ (Espagne = 1er H)
  { id:1013, round:"32es de finale", roundShort:"S13", team1:"🇨🇭 Suisse",           team2:"",     date:"03/07", time:"05:00" }, // N°85
  { id:1014, round:"32es de finale", roundShort:"S14", team1:"🇦🇷 Argentine",        team2:"🇨🇻 Cap-Vert",            date:"04/07", time:"00:00" }, // N°86 ✓ (Cap-Vert = 2e H)
  { id:1015, round:"32es de finale", roundShort:"S15", team1:"",                     team2:"",     date:"04/07", time:"03:30" }, // N°87
  { id:1016, round:"32es de finale", roundShort:"S16", team1:"🇦🇺 Australie",        team2:"🇪🇬 Égypte",             date:"03/07", time:"20:00" }, // N°88 ✓ (Égypte = 2e G)
  // ── 16es de finale ────────────────────────────────────────────────────────
  { id:1101, round:"16es de finale", roundShort:"H1", team1:"🏳️ Vainq. S1", team2:"🏳️ Vainq. S3", date:"04/07", time:"19:00" }, // N°90
  { id:1102, round:"16es de finale", roundShort:"H2", team1:"🏳️ Vainq. S2", team2:"🏳️ Vainq. S5", date:"04/07", time:"23:00" }, // N°89
  { id:1103, round:"16es de finale", roundShort:"H3", team1:"🏳️ Vainq. S4", team2:"🏳️ Vainq. S6", date:"05/07", time:"22:00" }, // N°91
  { id:1104, round:"16es de finale", roundShort:"H4", team1:"🏳️ Vainq. S7", team2:"🏳️ Vainq. S8", date:"06/07", time:"02:00" }, // N°92
  { id:1105, round:"16es de finale", roundShort:"H5", team1:"🏳️ Vainq. S11",team2:"🏳️ Vainq. S12",date:"06/07", time:"21:00" }, // N°93
  { id:1106, round:"16es de finale", roundShort:"H6", team1:"🏳️ Vainq. S9", team2:"🏳️ Vainq. S10",date:"07/07", time:"02:00" }, // N°94
  { id:1107, round:"16es de finale", roundShort:"H7", team1:"🏳️ Vainq. S14",team2:"🏳️ Vainq. S16",date:"07/07", time:"18:00" }, // N°95
  { id:1108, round:"16es de finale", roundShort:"H8", team1:"🏳️ Vainq. S13",team2:"🏳️ Vainq. S15",date:"07/07", time:"22:00" }, // N°96
  // ── Quarts de finale ──────────────────────────────────────────────────────
  { id:1201, round:"Quarts", roundShort:"QF1", team1:"🏳️ Vainq. H2", team2:"🏳️ Vainq. H1", date:"09/07", time:"22:00" }, // N°97
  { id:1202, round:"Quarts", roundShort:"QF2", team1:"🏳️ Vainq. H5", team2:"🏳️ Vainq. H6", date:"10/07", time:"21:00" }, // N°98
  { id:1203, round:"Quarts", roundShort:"QF3", team1:"🏳️ Vainq. H3", team2:"🏳️ Vainq. H4", date:"11/07", time:"23:00" }, // N°99
  { id:1204, round:"Quarts", roundShort:"QF4", team1:"🏳️ Vainq. H7", team2:"🏳️ Vainq. H8", date:"12/07", time:"03:00" }, // N°100
  // ── Demi-finales ──────────────────────────────────────────────────────────
  { id:1301, round:"Demi-finales", roundShort:"SF1", team1:"🏳️ Vainq. QF1", team2:"🏳️ Vainq. QF2", date:"14/07", time:"21:00" }, // N°101
  { id:1302, round:"Demi-finales", roundShort:"SF2", team1:"🏳️ Vainq. QF3", team2:"🏳️ Vainq. QF4", date:"15/07", time:"21:00" }, // N°102
  // ── Petite finale ─────────────────────────────────────────────────────────
  { id:1401, round:"Petite finale", roundShort:"3P",  team1:"🏳️ Perdant SF1", team2:"🏳️ Perdant SF2", date:"18/07", time:"23:00" }, // N°103
  // ── Finale ────────────────────────────────────────────────────────────────
  { id:1402, round:"Finale",        roundShort:"🏆",  team1:"🏳️ Vainq. SF1",  team2:"🏳️ Vainq. SF2",  date:"19/07", time:"21:00" }, // N°104
];

const ALL_KO_MATCHES = KNOCKOUT_MATCHES;

// ─── Pronos IA factices — déterministes par match ID ─
function genAIPred(matchId) {
  const pool = [
    [1,0],[2,0],[2,1],[1,1],[0,0],[3,1],[3,0],[2,2],[1,2],[0,1],[0,2],[3,2],[4,1],[1,3],[0,3],[4,0]
  ];
  const idx = ((matchId * 2654435761) >>> 0) % pool.length;
  const [s1, s2] = pool[idx];
  return { s1, s2 };
}
const AI_PREDS = Object.fromEntries(
  [...ALL_MATCHES, ...ALL_KO_MATCHES].map(m => [m.id, genAIPred(m.id)])
);

function calcPts(pred, real) {
  if (!pred || !real) return null;
  const { s1: ps1, s2: ps2 } = pred;
  const { s1: rs1, s2: rs2 } = real;
  if (ps1 === rs1 && ps2 === rs2) return 5;
  const po = ps1 > ps2 ? 1 : ps1 < ps2 ? 2 : 0;
  const ro = rs1 > rs2 ? 1 : rs1 < rs2 ? 2 : 0;
  if (po !== ro) return 0;
  if ((ps1 - ps2) === (rs1 - rs2)) return 4;
  if (ps1 === rs1 || ps2 === rs2) return 3;
  return 2;
}

// Barème phase finale (Option A) :
// Score final (90min + prolongations incluses, hors TAB) : 3pts exact / 2pts bon écart / 1pt bon résultat
// Bonus qualifié : +2pts si bonne équipe sélectionnée (inclut résultat TAB)
// Total max = 5pts
// L'offset 10000 encode le "vainqueur" dans une entrée predictions séparée :
//   preds[`${playerId}_${matchId + KO_WINNER_OFFSET}`] = { s1:1, s2:0 } → team1
//   preds[`${playerId}_${matchId + KO_WINNER_OFFSET}`] = { s1:0, s2:1 } → team2
const KO_WINNER_OFFSET = 10000;

function calcPtsKO(predScore, realScore, predWinner, realWinner) {
  if (!predScore || !realScore) return null;
  const { s1: ps1, s2: ps2 } = predScore;
  const { s1: rs1, s2: rs2 } = realScore;
  let pts = 0;
  // Score final (90min + prolongations si besoin, pas les TAB) → max 3pts
  if (ps1 === rs1 && ps2 === rs2) {
    pts += 3;
  } else {
    const po = ps1 > ps2 ? 1 : ps1 < ps2 ? 2 : 0;
    const ro = rs1 > rs2 ? 1 : rs1 < rs2 ? 2 : 0;
    if (po === ro) {
      if ((ps1 - ps2) === (rs1 - rs2)) pts += 2;
      else pts += 1;
    }
  }
  // Bonus vainqueur/qualifié (max 2pts)
  if (predWinner && realWinner && predWinner === realWinner) pts += 2;
  return pts;
}

function ptsMeta(pts) {
  if (pts === 5) return { icon:"🏆", label:"Score exact + qualifié", color:"green", hex:"#15803d", bg:"rgba(21,128,61,0.12)",  border:"rgba(21,128,61,0.4)"  };
  if (pts === 4) return { icon:"🎯", label:"Bon écart + qualifié",   color:"teal",  hex:"#0d9488", bg:"rgba(13,148,136,0.12)", border:"rgba(13,148,136,0.4)" };
  if (pts === 3) return { icon:"⚡", label:"Bon résultat + qualifié",color:"blue",  hex:"#1d4ed8", bg:"rgba(29,78,216,0.10)",  border:"rgba(29,78,216,0.35)" };
  if (pts === 2) return { icon:"✔",  label:"Bon résultat",           color:"gold",  hex:"#b45309", bg:"rgba(180,83,9,0.10)",   border:"rgba(180,83,9,0.35)"  };
  if (pts === 1) return { icon:"➕", label:"+1pt",                    color:"gray",  hex:"#6b7280", bg:"rgba(107,114,128,0.10)",border:"rgba(107,114,128,0.3)"};
  if (pts === 0) return { icon:"❌", label:"Raté",                    color:"red",   hex:"#dc2626", bg:"rgba(220,38,38,0.10)",  border:"rgba(220,38,38,0.35)" };
  return null;
}

const medalEmoji = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":null;

// Codes ISO pour flagcdn.com (prod) + emojis (artifact/dev)
const FLAG_DATA = {
  // Groupe A
  "Mexique":          { code:"mx",     emoji:"🇲🇽" },
  "Afrique du Sud":   { code:"za",     emoji:"🇿🇦" },
  "Corée du Sud":     { code:"kr",     emoji:"🇰🇷" },
  "Tchéquie":         { code:"cz",     emoji:"🇨🇿" },
  // Groupe B
  "Canada":           { code:"ca",     emoji:"🇨🇦" },
  "Bosnie-Herzégovine":{ code:"ba",   emoji:"🇧🇦" },
  "Qatar":            { code:"qa",     emoji:"🇶🇦" },
  "Suisse":           { code:"ch",     emoji:"🇨🇭" },
  // Groupe C
  "Brésil":           { code:"br",     emoji:"🇧🇷" },
  "Maroc":            { code:"ma",     emoji:"🇲🇦" },
  "Haïti":            { code:"ht",     emoji:"🇭🇹" },
  "Écosse":           { code:"gb-sct", emoji:"🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  // Groupe D
  "États-Unis":       { code:"us",     emoji:"🇺🇸" },
  "Paraguay":         { code:"py",     emoji:"🇵🇾" },
  "Australie":        { code:"au",     emoji:"🇦🇺" },
  "Turquie":          { code:"tr",     emoji:"🇹🇷" },
  // Groupe E
  "Allemagne":        { code:"de",     emoji:"🇩🇪" },
  "Curaçao":          { code:"cw",     emoji:"🇨🇼" },
  "Côte d'Ivoire":    { code:"ci",     emoji:"🇨🇮" },
  "Équateur":         { code:"ec",     emoji:"🇪🇨" },
  // Groupe F
  "Pays-Bas":         { code:"nl",     emoji:"🇳🇱" },
  "Japon":            { code:"jp",     emoji:"🇯🇵" },
  "Suède":            { code:"se",     emoji:"🇸🇪" },
  "Tunisie":          { code:"tn",     emoji:"🇹🇳" },
  // Groupe G
  "Belgique":         { code:"be",     emoji:"🇧🇪" },
  "Égypte":           { code:"eg",     emoji:"🇪🇬" },
  "Iran":             { code:"ir",     emoji:"🇮🇷" },
  "Nouvelle-Zélande": { code:"nz",     emoji:"🇳🇿" },
  // Groupe H
  "Espagne":          { code:"es",     emoji:"🇪🇸" },
  "Cap-Vert":         { code:"cv",     emoji:"🇨🇻" },
  "Arabie Saoudite":  { code:"sa",     emoji:"🇸🇦" },
  "Uruguay":          { code:"uy",     emoji:"🇺🇾" },
  // Groupe I
  "France":           { code:"fr",     emoji:"🇫🇷" },
  "Sénégal":          { code:"sn",     emoji:"🇸🇳" },
  "Irak":             { code:"iq",     emoji:"🇮🇶" },
  "Norvège":          { code:"no",     emoji:"🇳🇴" },
  // Groupe J
  "Argentine":        { code:"ar",     emoji:"🇦🇷" },
  "Algérie":          { code:"dz",     emoji:"🇩🇿" },
  "Autriche":         { code:"at",     emoji:"🇦🇹" },
  "Jordanie":         { code:"jo",     emoji:"🇯🇴" },
  // Groupe K
  "Portugal":         { code:"pt",     emoji:"🇵🇹" },
  "RD Congo":         { code:"cd",     emoji:"🇨🇩" },
  "Ouzbékistan":      { code:"uz",     emoji:"🇺🇿" },
  "Colombie":         { code:"co",     emoji:"🇨🇴" },
  // Groupe L
  "Angleterre":       { code:"gb-eng", emoji:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Croatie":          { code:"hr",     emoji:"🇭🇷" },
  "Ghana":            { code:"gh",     emoji:"🇬🇭" },
  "Panama":           { code:"pa",     emoji:"🇵🇦" },
};

// Détection : artifact Claude vs app déployée
const IS_DEPLOYED = typeof window !== "undefined" &&
  !window.location.hostname.includes("claude.ai") &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "";

const getFlagUrl  = (name) => IS_DEPLOYED && FLAG_DATA[name]
  ? `https://flagcdn.com/w80/${FLAG_DATA[name].code}.png`
  : null;

const getFlagEmoji = (name) => FLAG_DATA[name]?.emoji || "🏳️";

// Extrait { name, imgUrl, emoji } depuis "🇫🇷 France"
const splitTeam = (t) => {
  if (!t || !t.trim()) return { name:"", imgUrl:null, emoji:"❓" };
  const parts  = t.split(" ");
  const name   = parts.slice(1).join(" ") || t;
  return { name, imgUrl: getFlagUrl(name), emoji: getFlagEmoji(name) };
};

// ─── Design tokens ───────────────────────────────────
const G = "#15803d";   // forest green
const GOLD = "#b45309";
const TEXT = "#0f2d12";
const MUTED = "#4a7c59";

const card = {
  background:"rgba(255,255,255,0.88)",
  border:"1px solid rgba(255,255,255,0.6)",
  borderRadius:16,
  backdropFilter:"blur(10px)",
  WebkitBackdropFilter:"blur(10px)",
};

const pill = (meta) => ({
  display:"inline-flex", alignItems:"center", gap:4,
  padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700,
  background: meta.bg || "rgba(0,0,0,0.08)",
  color: meta.hex || TEXT,
  border: `1px solid ${meta.border || "rgba(0,0,0,0.15)"}`,
});

const navBtnS = (active) => ({
  padding:"6px 16px", borderRadius:20, border:"none", cursor:"pointer",
  fontSize:13, fontWeight:700, transition:"all 0.2s",
  background: active ? "#15803d" : "rgba(255,255,255,0.25)",
  color: active ? "#fff" : "#0f2d12",
  backdropFilter:"blur(4px)",
});

const scoreBox = {
  width:38, height:38, borderRadius:10,
  background:"rgba(255,255,255,0.9)", border:"1.5px solid rgba(21,128,61,0.3)",
  display:"flex", alignItems:"center", justifyContent:"center",
  fontSize:22, fontWeight:900, color: G,
};

const cBtn = {
  width:38, height:38, borderRadius:10,
  border:"1.5px solid rgba(21,128,61,0.3)", background:"rgba(255,255,255,0.9)",
  color: G, fontSize:22, fontWeight:700, cursor:"pointer",
  display:"flex", alignItems:"center", justifyContent:"center",
};

const inputS = {
  background:"rgba(255,255,255,0.9)", border:"1.5px solid rgba(21,128,61,0.3)",
  borderRadius:10, padding:"10px 14px", color: TEXT,
  fontSize:15, width:"100%", outline:"none", boxSizing:"border-box",
};

const btnS = (v) => ({
  padding:"10px 22px", borderRadius:12, border:"none", cursor:"pointer",
  fontSize:14, fontWeight:700, letterSpacing:0.3, transition:"all 0.15s",
  background: v==="primary"?"#15803d":v==="gold"?"#b45309":v==="danger"?"#dc2626":"rgba(255,255,255,0.5)",
  color: v==="ghost"? TEXT : "#fff",
  backdropFilter: v==="ghost"?"blur(4px)":"none",
});

// ─── Main App ────────────────────────────────────────
export default function CocoProno() {
  const [view, setView] = useState("login");
  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  const [preds, setPreds] = useState({});
  const predsRef = useRef({});
  // Synchronise predsRef à chaque changement de preds
  useEffect(() => { predsRef.current = preds; }, [preds]);
  const [realScores, setRealScores] = useState({});
  const [loading, setLoading] = useState(true);

  // Auth flow: "home" | "signup" | "verify"
  const [authStep, setAuthStep] = useState("home");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupError, setSignupError] = useState("");
  const [verifyPlayer, setVerifyPlayer] = useState(null);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const [filterG, setFilterG] = useState("all");
  const [filterMD, setFilterMD] = useState("all");
  const [scorePhase, setScorePhase] = useState("groupes"); // "groupes" | "finale"
  const [filterPhase, setFilterPhase] = useState("groupes"); // "groupes" | "finale"
  const [bracketView, setBracketView] = useState(false);
  const [koTeams, setKoTeams] = useState({}); // { matchId: { team1, team2 } } — noms édités par admin
  const [inlineInputs, setInlineInputs] = useState({});  // { matchId: { s1, s2 } }
  const [editReal, setEditReal] = useState(null);
  const [now, setNow] = useState(new Date());
  const [saveStatus, setSaveStatus] = useState("idle");
  const [matchSaveStatus, setMatchSaveStatus] = useState({}); // { [matchId]: "saving"|"saved"|"error" }

  // Mise à jour toutes les minutes pour activer le verrouillage en temps réel
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Vérifier si un match est verrouillé (commencé)
  const isMatchLocked = (m) => {
    if (!m.date || !m.time) return false;
    const [d, mo] = m.date.split("/").map(Number);
    const [h, mi] = m.time.split(":").map(Number);
    // Horaires en CEST (UTC+2). Calcul en UTC pour éviter tout problème de fuseau.
    // h-2 peut être négatif → JS normalise automatiquement (ex: -2h = veille 22h UTC)
    const kickoffUTC = Date.UTC(2026, mo - 1, d, h - 2, mi);
    return Date.now() >= kickoffUTC;
  };
  const [rInput, setRInput] = useState({ s1:0, s2:0, winner:null });
  const [adminPin, setAdminPin] = useState("");
  const [adminOk, setAdminOk] = useState(false);
  const [adminErr, setAdminErr] = useState(false);
  const [adminTab, setAdminTab] = useState("scores");

  // ─── Email(s) admin ──────────────────────────────
  const ADMIN_EMAILS = ["robinlb@live.fr"];
  const isAdmin = me && ADMIN_EMAILS.includes(me.email?.toLowerCase());
  const [iaStatus, setIaStatus] = useState("idle");
  const [parrotSrc, setParrotSrc] = useState(PARROT_IMG);
  const [rankPage, setRankPage] = useState(-1); // -1 = auto (va sur la page du joueur)
  const RANK_PAGE_SIZE = 10;
  const ADMIN_CODE = "coupe2026";

  // Remove pure black background from parrot via canvas pixel manipulation
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = Math.max(r, g, b);
        if (brightness < 50) {
          data[i+3] = Math.round((brightness / 50) * 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setParrotSrc(canvas.toDataURL("image/png"));
    };
    img.src = PARROT_IMG;
  }, []);

  // ─── Détection du mode de stockage ───────────────────
  const storageMode = useRef("storage"); // "supabase" | "storage"
  const [sbMode, setSbMode] = useState("storage"); // pour affichage UI

  const storageSave = async (k, v) => { try { await window.storage.set(k, JSON.stringify(v)); } catch {} };

  // Helper : timeout pour les requêtes réseau
  const withTimeout = (promise, ms = 15000) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

  // Retry automatique sur les requêtes Supabase (3 tentatives)
  const sbWithRetry = async (fn, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fn();
        return res;
      } catch(e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 1s, 2s entre les essais
      }
    }
  };

  // ─── Chargement initial ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Tente Supabase avec timeout 15s (connexions lentes)
        const [pl, pr, sc] = await withTimeout(Promise.all([
          sbSelect("players"),
          sbSelect("predictions"),
          sbSelect("real_scores"),
        ]), 15000);

        if (Array.isArray(pl)) {
          storageMode.current = "supabase";
          setSbMode("supabase");
          const playersList = pl || [];
          const predsMap = {};
          (pr || []).forEach(r => { predsMap[`${r.player_id}_${r.match_id}`] = { s1: r.score1, s2: r.score2 }; });
          const scoresMap = {};
          (sc || []).forEach(r => { scoresMap[r.match_id] = { s1: r.score1, s2: r.score2 }; });
          setPlayers(playersList);
          setPreds(predsMap);
          setRealScores(scoresMap);
          try { const kt = localStorage.getItem("cp_ko_teams"); if (kt) setKoTeams(JSON.parse(kt)); } catch {}
          const savedId = localStorage.getItem("cp_me");
          if (savedId) {
            const p = playersList.find(x => x.id === savedId);
            if (p) { setMe(p); setView("matches"); }
          }
          setLoading(false);
          return;
        }
      } catch(e) { console.warn("Supabase indisponible ou timeout → window.storage", e.message); }

      // Fallback → window.storage (mode artifact)
      storageMode.current = "storage";
      try {
        const results = await Promise.allSettled([
          window.storage.get("cp_players"),
          window.storage.get("cp_preds"),
          window.storage.get("cp_scores"),
          window.storage.get("cp_me"),
          window.storage.get("cp_ko_teams"),
        ]);
        const pl = results[0].value?.value ? JSON.parse(results[0].value.value) : [];
        const pr = results[1].value?.value ? JSON.parse(results[1].value.value) : {};
        const sc = results[2].value?.value ? JSON.parse(results[2].value.value) : {};
        const kt = results[4].value?.value ? JSON.parse(results[4].value.value) : {};
        setPlayers(pl); setPreds(pr); setRealScores(sc); setKoTeams(kt);
        if (results[3].value?.value) {
          const p = pl.find(x => x.id === results[3].value.value);
          if (p) { setMe(p); setView("matches"); }
        }
      } catch(e) { console.error("Storage error", e); }
      setLoading(false);
    })();
  }, []);

  // ─── Polling 15s (Supabase seulement) ────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (storageMode.current !== "supabase") return;
      const [sc, pr] = await Promise.all([
        sbSelect("real_scores"),
        sbSelect("predictions"),
      ]);
      if (Array.isArray(sc)) {
        const scoresMap = {};
        sc.forEach(r => { scoresMap[r.match_id] = { s1: r.score1, s2: r.score2 }; });
        setRealScores(scoresMap);
      }
      if (Array.isArray(pr)) {
        const predsFromDb = {};
        pr.forEach(r => { predsFromDb[`${r.player_id}_${r.match_id}`] = { s1: r.score1, s2: r.score2 }; });
        setPreds(prev => ({ ...prev, ...predsFromDb }));
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Rechargement des pronos depuis Supabase quand on ouvre le classement
  useEffect(() => {
    if (view !== "ranking" || storageMode.current !== "supabase") return;
    setRankPage(-1); // reset pour atterrir sur la page du joueur
    (async () => {
      const pr = await sbSelect("predictions");
      if (Array.isArray(pr)) {
        const predsFromDb = {};
        pr.forEach(r => { predsFromDb[`${r.player_id}_${r.match_id}`] = { s1: r.score1, s2: r.score2 }; });
        setPreds(prev => ({ ...prev, ...predsFromDb }));
      }
    })();
  }, [view]);

  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return "***";
    const [user, domain] = email.split("@");
    return user.slice(0,2) + "***@" + domain;
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailLogin = async () => {
    const email = verifyEmail.trim().toLowerCase();
    if (!isValidEmail(email)) { setVerifyError("Adresse email invalide."); return; }
    const found = players.find(p => p.email?.toLowerCase() === email);
    if (!found) { setVerifyError("Aucun compte trouvé avec cet email. Tu peux en créer un."); return; }
    // Connexion directe — l'email suffit comme preuve d'identité
    if (storageMode.current === "supabase") localStorage.setItem("cp_me", found.id);
    else try { await window.storage.set("cp_me", found.id); } catch {}
    setMe(found); setView("matches");
  };

  const handleSignup = async () => {
    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();
    if (!name) { setSignupError("Entre ton prénom."); return; }
    if (!isValidEmail(email)) { setSignupError("Adresse email invalide."); return; }
    if (players.find(p => p.email === email)) {
      setSignupError("Cette adresse email est déjà utilisée."); return;
    }
    const newPlayer = { id: Date.now().toString(), name, email, avatar: name[0].toUpperCase() };
    if (storageMode.current === "supabase") {
      const res = await sbInsert("players", newPlayer);
      if (!res.ok) { const err = await res.text(); setSignupError("Erreur serveur : " + err); return; }
      localStorage.setItem("cp_me", newPlayer.id);
    } else {
      const next = [...players, newPlayer];
      await storageSave("cp_players", next);
      try { await window.storage.set("cp_me", newPlayer.id); } catch {}
    }
    setPlayers(prev => [...prev, newPlayer]);
    setMe(newPlayer); setView("matches");
  };

  const handleVerify = async () => {
    if (!verifyPlayer.email) {
      if (storageMode.current === "supabase") localStorage.setItem("cp_me", verifyPlayer.id);
      else try { await window.storage.set("cp_me", verifyPlayer.id); } catch {}
      setMe(verifyPlayer); setView("matches"); return;
    }
    const email = verifyEmail.trim().toLowerCase();
    if (email !== verifyPlayer.email) { setVerifyError("Email incorrect. Réessaie."); return; }
    if (storageMode.current === "supabase") localStorage.setItem("cp_me", verifyPlayer.id);
    else try { await window.storage.set("cp_me", verifyPlayer.id); } catch {}
    setMe(verifyPlayer); setView("matches");
  };

  const logout = async () => {
    setMe(null); setView("login"); setAuthStep("home");
    if (storageMode.current === "supabase") localStorage.removeItem("cp_me");
    else try { await window.storage.delete("cp_me"); } catch {}
  };

  const openPred = (m) => {
    if (!me) return;
    const k = `${me.id}_${m.id}`;
    const p = preds[k];
    setPInput(p ? { s1:p.s1, s2:p.s2 } : { s1:0, s2:0 });
    setEditMatch(m);
  };

  const saveInlinePred = async (matchId, s1, s2) => {
    if (!me) return;
    const v1 = s1 !== undefined && s1 !== "" ? parseInt(s1) : null;
    const v2 = s2 !== undefined && s2 !== "" ? parseInt(s2) : null;
    if (v1 === null && v2 === null) return;
    const s1n = v1 !== null ? v1 : (predsRef.current[`${me.id}_${matchId}`]?.s1 ?? 0);
    const s2n = v2 !== null ? v2 : (predsRef.current[`${me.id}_${matchId}`]?.s2 ?? 0);
    if (isNaN(s1n) || isNaN(s2n)) return;
    const k = `${me.id}_${matchId}`;
    const val = { s1: s1n, s2: s2n };
    setPreds(prev => ({ ...prev, [k]: val }));
    setMatchSaveStatus(prev => ({ ...prev, [matchId]: "saving" }));
    const clearStatus = (status) => {
      setMatchSaveStatus(prev => ({ ...prev, [matchId]: status }));
      setTimeout(() => setMatchSaveStatus(prev => { const n={...prev}; delete n[matchId]; return n; }), status === "saved" ? 2500 : 4000);
    };
    try {
      if (storageMode.current === "supabase") {
        await sbWithRetry(() =>
          sbUpsert("predictions", { player_id: me.id, match_id: matchId, score1: s1n, score2: s2n })
        );
      } else {
        await storageSave("cp_preds", { ...predsRef.current, [k]: val });
      }
      clearStatus("saved");
    } catch(e) {
      console.warn("saveInlinePred échoué:", e);
      storageSave("cp_preds", { ...predsRef.current, [k]: val }).catch(() => {});
      clearStatus("error");
    }
  };

  // Sauvegarde globale — pousse toutes les saisies vers Supabase
  const saveAllPreds = async () => {
    if (!me) return;
    setSaveStatus("saving");
    try {
      let saved = 0, failed = 0;
      // Collecte UNIQUEMENT les saisies en cours (inlineInputs) — ne jamais écraser le state complet
      const toSave = {};
      for (const [midStr, local] of Object.entries(inlineInputs)) {
        const mid = parseInt(midStr);
        const existing = predsRef.current[`${me.id}_${mid}`];
        const s1 = local.s1 !== undefined && local.s1 !== "" ? parseInt(local.s1) : existing?.s1 ?? null;
        const s2 = local.s2 !== undefined && local.s2 !== "" ? parseInt(local.s2) : existing?.s2 ?? null;
        if (s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2)) toSave[mid] = { s1, s2 };
      }
      // Aussi sync les pronos en mémoire qui ne sont pas encore dans Supabase
      Object.keys(predsRef.current).filter(k => k.startsWith(`${me.id}_`)).forEach(k => {
        const mid = parseInt(k.split("_")[1]);
        if (!toSave[mid]) toSave[mid] = predsRef.current[k];
      });

      if (storageMode.current === "supabase") {
        for (const [midStr, { s1, s2 }] of Object.entries(toSave)) {
          try {
            await sbWithRetry(() =>
              sbUpsert("predictions", { player_id: me.id, match_id: parseInt(midStr), score1: s1, score2: s2 })
            );
            saved++;
          } catch(e) { console.warn(`match ${midStr}:`, e.message); failed++; }
        }
      } else {
        // Mode local : merge (jamais écraser)
        const merged = { ...predsRef.current };
        Object.entries(toSave).forEach(([mid, v]) => { merged[`${me.id}_${mid}`] = v; });
        await storageSave("cp_preds", merged);
        saved = Object.keys(toSave).length;
      }

      // Merge dans le state (jamais remplacer)
      setPreds(prev => {
        const merged = { ...prev };
        Object.entries(toSave).forEach(([mid, v]) => { merged[`${me.id}_${mid}`] = v; });
        return merged;
      });
      setInlineInputs({});
      if (failed === 0) setSaveStatus("saved");
      else if (saved > 0) setSaveStatus("partial");
      else setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } catch(e) {
      console.error("saveAllPreds:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  const SIM_SCORES = {1:{s1:0,s2:1},2:{s1:0,s2:0},3:{s1:1,s2:1},4:{s1:0,s2:1},5:{s1:0,s2:2},6:{s1:0,s2:0},7:{s1:2,s2:6},8:{s1:0,s2:0},9:{s1:1,s2:0},10:{s1:1,s2:0},11:{s1:0,s2:0},12:{s1:0,s2:0},13:{s1:0,s2:0},14:{s1:0,s2:0},15:{s1:0,s2:0},16:{s1:1,s2:0},17:{s1:3,s2:0},18:{s1:3,s2:3},19:{s1:1,s2:0},20:{s1:0,s2:2},21:{s1:0,s2:0},22:{s1:0,s2:0},23:{s1:0,s2:0},24:{s1:1,s2:1},25:{s1:0,s2:2},26:{s1:1,s2:0},27:{s1:4,s2:2},28:{s1:0,s2:0},29:{s1:0,s2:0},30:{s1:0,s2:1},31:{s1:0,s2:1},32:{s1:1,s2:1},33:{s1:0,s2:1},34:{s1:2,s2:0},35:{s1:3,s2:2},36:{s1:1,s2:2},37:{s1:0,s2:0},38:{s1:0,s2:0},39:{s1:0,s2:0},40:{s1:0,s2:0},41:{s1:0,s2:0},42:{s1:2,s2:0},43:{s1:0,s2:0},44:{s1:0,s2:0},45:{s1:1,s2:1},46:{s1:0,s2:1},47:{s1:1,s2:1},48:{s1:0,s2:2},49:{s1:0,s2:0},50:{s1:0,s2:0},51:{s1:1,s2:0},52:{s1:1,s2:1},53:{s1:0,s2:3},54:{s1:0,s2:1},55:{s1:6,s2:0},56:{s1:0,s2:0},57:{s1:0,s2:1},58:{s1:0,s2:0},59:{s1:3,s2:0},60:{s1:1,s2:0},61:{s1:0,s2:1},62:{s1:0,s2:0},63:{s1:2,s2:0},64:{s1:0,s2:0},65:{s1:4,s2:0},66:{s1:1,s2:0},67:{s1:0,s2:0},68:{s1:1,s2:2},69:{s1:0,s2:3},70:{s1:0,s2:0},71:{s1:5,s2:1},72:{s1:0,s2:2}};

  const simulateScores = async () => {
    if (!window.confirm("Injecter 72 scores simulés pour tester ? (Remplace les scores existants)")) return;
    const newScores = { ...realScores, ...SIM_SCORES };
    setRealScores(newScores);
    if (storageMode.current === "supabase") {
      for (const [mid, sc] of Object.entries(SIM_SCORES)) {
        await sbUpsert("real_scores", { match_id: parseInt(mid), score1: sc.s1, score2: sc.s2 });
      }
    } else {
      await storageSave("cp_scores", newScores);
    }
  };

  const resetGroupScores = async () => {
    if (!window.confirm("Effacer tous les scores réels des groupes ?")) return;
    const newScores = { ...realScores };
    ALL_MATCHES.forEach(m => delete newScores[m.id]);
    setRealScores(newScores);
    if (storageMode.current === "supabase") {
      for (const m of ALL_MATCHES) {
        await fetch(`${SB_URL}/real_scores?match_id=eq.${m.id}`, { method:"DELETE", headers:sbH() });
      }
    } else {
      await storageSave("cp_scores", newScores);
    }
  };

  const saveWinner = async (matchId, winner) => {
    if (!me) return;
    // Encode : team1 → { s1:1, s2:0 }, team2 → { s1:0, s2:1 }
    const val = winner === "team1" ? { s1:1, s2:0 } : { s1:0, s2:1 };
    const k = `${me.id}_${matchId + KO_WINNER_OFFSET}`;
    setPreds(prev => ({ ...prev, [k]: val }));
    if (storageMode.current === "supabase") {
      await sbWithRetry(() =>
        sbUpsert("predictions", { player_id: me.id, match_id: matchId + KO_WINNER_OFFSET, score1: val.s1, score2: val.s2 })
      ).catch(e => console.warn("saveWinner:", e));
    } else {
      storageSave("cp_preds", { ...predsRef.current, [k]: val });
    }
  };

  const openReal = (m) => {
    const r = realScores[m.id];
    setRInput(r ? { s1:r.s1, s2:r.s2, winner: (() => {
      const w = realScores[m.id + KO_WINNER_OFFSET];
      return w ? (w.s1 > w.s2 ? "team1" : "team2") : null;
    })() } : { s1:0, s2:0, winner:null });
    setEditReal(m);
  };

  const saveReal = async () => {
    const next = { ...realScores, [editReal.id]: rInput };
    setRealScores(next);
    setEditReal(null);
    if (storageMode.current === "supabase") {
      await sbUpsert("real_scores", { match_id: editReal.id, score1: rInput.s1, score2: rInput.s2 });
      // Matchs KO : sauvegarde du vainqueur (TAB, prolongations)
      if (editReal.id >= 1001 && rInput.winner) {
        const wVal = rInput.winner === "team1" ? { s1:1, s2:0 } : { s1:0, s2:1 };
        await sbUpsert("real_scores", { match_id: editReal.id + KO_WINNER_OFFSET, score1: wVal.s1, score2: wVal.s2 });
        setRealScores(prev => ({ ...prev, [editReal.id + KO_WINNER_OFFSET]: wVal }));
      }
    } else {
      await storageSave("cp_scores", next);
    }
  };

  const saveKoTeams = async (next) => {
    setKoTeams(next);
    if (storageMode.current === "supabase") {
      try { localStorage.setItem("cp_ko_teams", JSON.stringify(next)); } catch {}
    } else {
      await storageSave("cp_ko_teams", next);
    }
  };

  // ─── Preds effectifs : fusionne preds (BDD) + inlineInputs (saisie en cours) ──
  // Garantit que les saisies non encore sauvegardées comptent quand même dans le classement
  const effectivePreds = (() => {
    const merged = { ...preds };
    if (me) {
      Object.entries(inlineInputs).forEach(([matchId, local]) => {
        const s1 = local.s1 !== undefined ? local.s1 : "";
        const s2 = local.s2 !== undefined ? local.s2 : "";
        if (s1 !== "" && s2 !== "") {
          const s1n = parseInt(s1), s2n = parseInt(s2);
          if (!isNaN(s1n) && !isNaN(s2n)) {
            merged[`${me.id}_${matchId}`] = { s1: s1n, s2: s2n };
          }
        }
      });
    }
    return merged;
  })();

  const humanPlayers = [...players].filter(p => p.id !== "cocoprono-ia").map(p => {
    let pts = 0, exact = 0, ecart = 0, partial = 0, correct = 0;
    [...ALL_MATCHES, ...ALL_KO_MATCHES].forEach(m => {
      const pred = effectivePreds[`${p.id}_${m.id}`];
      const real = realScores[m.id];
      let n;
      if (m.id >= 1001) {
        // Match KO : barème Option A
        const predW = effectivePreds[`${p.id}_${m.id + KO_WINNER_OFFSET}`];
        const realW = realScores[m.id + KO_WINNER_OFFSET];
        const predWinner = predW ? (predW.s1 > predW.s2 ? "team1" : "team2") : null;
        const realWinner = realW ? (realW.s1 > realW.s2 ? "team1" : "team2") : null;
        n = calcPtsKO(pred, real, predWinner, realWinner);
      } else {
        n = calcPts(pred, real);
      }
      if (n !== null) { pts += n; if(n===5) exact++; else if(n===4) ecart++; else if(n===3) partial++; else if(n>=1) correct++; }
    });
    return { ...p, pts, exact, ecart, partial, correct };
  });

  // Entrée IA : utilise le vrai compte cocoprono-ia s'il existe, sinon l'entrée statique
  const realIaPlayer = players.find(p => p.id === "cocoprono-ia");
  const aiEntry = (() => {
    const iaId = realIaPlayer ? "cocoprono-ia" : "__ai__";
    let pts = 0, exact = 0, ecart = 0, partial = 0, correct = 0;
    [...ALL_MATCHES, ...ALL_KO_MATCHES].forEach(m => {
      const pred = effectivePreds[`${iaId}_${m.id}`] || (iaId === "__ai__" ? AI_PREDS[m.id] : null);
      const real = realScores[m.id];
      let n;
      if (m.id >= 1001) {
        const predW = effectivePreds[`${iaId}_${m.id + KO_WINNER_OFFSET}`];
        const realW = realScores[m.id + KO_WINNER_OFFSET];
        const predWinner = predW ? (predW.s1 > predW.s2 ? "team1" : "team2") : null;
        const realWinner = realW ? (realW.s1 > realW.s2 ? "team1" : "team2") : null;
        n = calcPtsKO(pred, real, predWinner, realWinner);
      } else {
        n = calcPts(pred, real);
      }
      if (n !== null) { pts += n; if(n===5) exact++; else if(n===4) ecart++; else if(n===3) partial++; else if(n>=1) correct++; }
    });
    return { id: iaId, name:"CocoProno IA", avatar:"🦜", isAI:true, pts, exact, ecart, partial, correct };
  })();

  const leaderboard = [...humanPlayers, aiEntry].sort((a,b) => b.pts - a.pts || b.exact - a.exact || b.ecart - a.ecart);

  const myPred = (m) => effectivePreds[me ? `${me.id}_${m.id}` : null];
  const myWinner = (m) => {
    const w = effectivePreds[me ? `${me.id}_${m.id + KO_WINNER_OFFSET}` : null];
    return w ? (w.s1 > w.s2 ? "team1" : "team2") : null;
  };
  const myPts = (m) => {
    if (m.id >= 1001) {
      const realW = realScores[m.id + KO_WINNER_OFFSET];
      const realWinner = realW ? (realW.s1 > realW.s2 ? "team1" : "team2") : null;
      return calcPtsKO(myPred(m), realScores[m.id], myWinner(m), realWinner);
    }
    return calcPts(myPred(m), realScores[m.id]);
  };

  // ─── Calcul automatique des qualifiés ─────────────────
  const { groupStandings, qualified, thirds } = computeQualified(realScores);

  // Résout un slot ("1A", "2B", "3e1", "W1001", "L1301"...) en nom d'équipe
  const resolveSlot = (slot) => {
    if (!slot) return null;
    if (slot.startsWith("3e")) {
      const idx = parseInt(slot.replace("3e","")) - 1;
      return thirds[idx] || null;
    }
    if (slot.startsWith("W") || slot.startsWith("L")) {
      const refId = parseInt(slot.slice(1));
      const real = realScores[refId];
      if (!real || real.s1 === real.s2) return null; // pas joué, ou égalité (TAB non géré auto)
      const t1 = resolveKoTeam(refId, "team1");
      const t2 = resolveKoTeam(refId, "team2");
      if (!t1 || !t2) return null;
      const winnerIsT1 = real.s1 > real.s2;
      if (slot.startsWith("W")) return winnerIsT1 ? t1 : t2;
      return winnerIsT1 ? t2 : t1; // L = perdant
    }
    return qualified[slot] || null;
  };

  // Fusionne : koTeams manuels priment sur le calcul auto
  const resolveKoTeam = (matchId, side) => {
    const manual = koTeams[matchId]?.[side];
    if (manual && manual.trim()) return manual; // priorité au manuel
    const slot = KO_SLOT_MAP[matchId]?.[side === "team1" ? "t1" : "t2"];
    const auto = resolveSlot(slot);
    return auto || null;
  };
  const myStats = me ? leaderboard.find(p => p.id === me.id) : null;
  const myRank  = me ? leaderboard.findIndex(p => p.id === me.id) + 1 : null;

  const kickoffUTC = m => {
    const [d, mo] = m.date.split("/").map(Number);
    const [h, mi] = m.time.split(":").map(Number);
    return Date.UTC(2026, mo - 1, d, h - 2, mi);
  };

  const filtered = (() => {
    const list = ALL_MATCHES.filter(m => {
      if (filterG !== "all" && m.group !== filterG) return false;
      if (filterMD !== "all" && m.md !== +filterMD) return false;
      return true;
    });
    // Tri chronologique uniquement quand aucun filtre actif (onglet "Tous")
    if (filterG === "all" && filterMD === "all") {
      return [...list].sort((a, b) => kickoffUTC(a) - kickoffUTC(b));
    }
    return list;
  })();

  // ─── Layout wrapper — fonction, pas composant, pour préserver le focus des inputs ─
  const pageWrap = (children) => (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      backgroundImage:`url(${JUNGLE_IMG})`,
      backgroundSize:"cover", backgroundPosition:"center", backgroundAttachment:"fixed",
    }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        *{box-sizing:border-box}
        .bottom-nav{display:none}
        .top-nav-btns{display:flex;gap:4px}
        @media(max-width:600px){
          .stats-bar{grid-template-columns:repeat(3,1fr)!important}
          .stat-hidden{display:none!important}
          .hero-parrot{height:110px!important}
          .hero-title{font-size:42px!important;letter-spacing:-1.5px!important}
          .hero-sub{font-size:14px!important}
          .match-flag{width:56px!important;height:42px!important}
          .score-input{width:46px!important;height:46px!important;font-size:22px!important}
          .header-inner{height:64px!important;padding:0 14px!important}
          .header-logo-text{font-size:16px!important}
          .content-pad{padding:14px 10px 80px!important}
          .top-nav-btns{display:none!important}
          .logout-btn{display:none!important}
          .bottom-nav{display:flex!important;position:fixed;bottom:0;left:0;right:0;z-index:50;
            background:rgba(8,35,12,0.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
            border-top:1px solid rgba(255,255,255,0.1);padding:6px 0 env(safe-area-inset-bottom,6px)}
        }
      `}</style>
      {/* Overlay */}
      <div style={{ position:"fixed", inset:0, background:"rgba(10,50,15,0.78)", pointerEvents:"none", zIndex:0 }} />

      {/* ── Header ── */}
      <div className="header-inner" style={{
        position:"sticky", top:0, zIndex:50,
        background: me ? "rgba(8,35,12,0.92)" : "rgba(255,255,255,0.92)",
        backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
        borderBottom: me ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
        padding:"0 20px", height:90, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0,
      }}>
        {/* Gauche : avatar + nom */}
        <div style={{ width:110, display:"flex", alignItems:"center", gap:8 }}>
          {me && <>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#0f2d12", flexShrink:0 }}>{me.avatar}</div>
            <div className="logout-btn" style={{ lineHeight:1.3 }}>
              <div style={{ fontSize:11, fontWeight:700, color: me ? "#fff" : TEXT }}>{me.name?.split(" ")[0]}</div>
              <button style={{ fontSize:10, color:"rgba(255,255,255,0.4)", background:"none", border:"none", cursor:"pointer", padding:0 }} onClick={logout}>Changer</button>
            </div>
          </>}
        </div>

        {/* Centre : logo */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
          <img src={parrotSrc} alt="Coco" className="hero-parrot" style={{ height:52, width:"auto" }} />
          <div className="header-logo-text" style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.5px", color: me ? "#fbbf24" : G, lineHeight:1 }}>CocoProno</div>
          <div style={{ fontSize:9, color: me ? "rgba(255,255,255,0.4)" : MUTED, letterSpacing:1.5, textTransform:"uppercase" }}>by Cocopilot · CdM 2026</div>
        </div>

        {/* Droite : nav desktop */}
        <div style={{ width:110, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
          {me && <>
            <div className="top-nav-btns">
              <button style={navBtnS(view==="matches")} onClick={()=>setView("matches")}>Matchs</button>
              <button style={navBtnS(view==="ranking")} onClick={()=>setView("ranking")}>🏆</button>
              {isAdmin && <button style={navBtnS(view==="admin")} onClick={()=>setView("admin")}>⚙</button>}
            </div>
            <a href="https://cocopilot.blog/" target="_blank" rel="noreferrer"
              style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textDecoration:"none", letterSpacing:0.3 }}>
              cocopilot.blog ↗
            </a>
          </>}
        </div>
      </div>

      {/* ── Barre de nav mobile (fixée en bas) ── */}
      {me && (
        <nav className="bottom-nav">
          {[
            { id:"matches", icon:"⚽", label:"Matchs" },
            { id:"ranking", icon:"🏆", label:"Classement" },
            ...(isAdmin ? [{ id:"admin", icon:"⚙️", label:"Admin" }] : []),
            { id:"__logout__", icon:"👤", label: (me.name||"Moi").split(" ")[0] },
            { id:"__blog__", icon:"🌐", label:"Blog" },
          ].map(item => (
            <button key={item.id}
              onClick={() => {
                if (item.id === "__logout__") logout();
                else if (item.id === "__blog__") window.open("https://cocopilot.blog/", "_blank");
                else setView(item.id);
              }}
              style={{
                flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                background:"none", border:"none", cursor:"pointer", padding:"6px 2px",
                color: view === item.id ? "#fbbf24" : "rgba(255,255,255,0.5)",
                transition:"color 0.15s",
              }}>
              <span style={{ fontSize:22, lineHeight:1 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight:700 }}>{item.label}</span>
              {view === item.id && item.id !== "__logout__" && item.id !== "__blog__" && (
                <div style={{ width:20, height:2.5, borderRadius:2, background:"#fbbf24", marginTop:1 }} />
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Content */}
      <div className="content-pad" style={{ flex:1, overflowY:"auto", padding:"24px 16px", position:"relative", zIndex:1 }}>
        {children}
      </div>
    </div>
  );

  if (loading) return pageWrap(
    <>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:16 }}>
        <img src={parrotSrc} alt="" style={{ height:100 }} />
        <div style={{ color:"#fbbf24", fontSize:18, fontWeight:700 }}>Chargement...</div>
      </div>
    </>
  );

  // ─── LOGIN ────────────────────────────────────────
  if (view === "login") return pageWrap(
    <>
      <div style={{ maxWidth:480, margin:"0 auto" }}>

        {/* Hero */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, padding:"28px 0 20px" }}>
          <img src={parrotSrc} alt="Coco" className="hero-parrot" style={{ height:160, width:"auto", flexShrink:0, maxWidth:"40vw" }} />
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div className="hero-title" style={{ fontSize:58, fontWeight:900, color:"#fff", letterSpacing:"-2px", lineHeight:0.95, textShadow:"0 2px 20px rgba(0,0,0,0.4)" }}>
              Coco<span style={{ color:"#fbbf24" }}>Prono</span>
            </div>
            <div className="hero-sub" style={{ fontSize:17, fontWeight:700, color:"rgba(255,255,255,0.90)", letterSpacing:"-0.3px", textShadow:"0 1px 8px rgba(0,0,0,0.4)" }}>
              Qui peut battre l'IA&nbsp;?
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", letterSpacing:1.5, textTransform:"uppercase", marginTop:2 }}>
              Coupe du Monde 2026
            </div>
          </div>
        </div>

        {/* ── STEP: HOME ── */}
        {authStep === "home" && (
          <>
            {/* Connexion par email uniquement — sans afficher la liste des joueurs */}
            <div style={{ ...card, padding:"22px 20px", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800, color: TEXT, marginBottom:4 }}>Se connecter</div>
              <div style={{ fontSize:12, color: MUTED, marginBottom:16 }}>Entre ton adresse email pour accéder à ton compte.</div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color: MUTED, textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:6 }}>Email</label>
                <input
                  style={inputS} type="email" placeholder="ton@email.com"
                  value={verifyEmail}
                  onChange={e => { setVerifyEmail(e.target.value); setVerifyError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleEmailLogin(); }}
                  autoFocus
                />
                {verifyError && (
                  <div style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.3)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#dc2626", fontWeight:600, marginTop:10 }}>
                    {verifyError}
                  </div>
                )}
              </div>
              <button style={{ ...btnS("primary"), width:"100%" }} onClick={handleEmailLogin}>
                Accéder à mon compte →
              </button>
            </div>

            <div style={{ ...card, padding:"16px 20px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color: TEXT, marginBottom:4 }}>Pas encore inscrit ?</div>
              <div style={{ fontSize:12, color: MUTED, marginBottom:14 }}>Crée ton profil pour participer.</div>
              <button style={{ ...btnS("ghost"), width:"100%", border:"1px solid rgba(0,0,0,0.12)" }} onClick={() => { setSignupName(""); setSignupEmail(""); setSignupError(""); setAuthStep("signup"); }}>
                Créer mon profil →
              </button>
            </div>

            {/* 🏆 Prize block */}
            <div style={{
              marginTop:20, borderRadius:20, overflow:"hidden",
              boxShadow:"0 8px 40px rgba(0,0,0,0.4)",
              border:"2px solid rgba(251,191,36,0.6)",
            }}>
              {/* Top gradient band */}
              <div style={{
                background:"linear-gradient(135deg, #f59e0b, #fbbf24 50%, #f59e0b)",
                padding:"18px 22px 14px",
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", color:"rgba(0,0,0,0.5)", marginBottom:4 }}>À gagner</div>
                  <div style={{ fontSize:28, fontWeight:900, color:"#1c0a00", letterSpacing:"-0.5px", lineHeight:1 }}>Un maillot</div>
                  <div style={{ fontSize:28, fontWeight:900, color:"#1c0a00", letterSpacing:"-0.5px", lineHeight:1 }}>de ton choix&nbsp;👕</div>
                </div>
                <div style={{ fontSize:72, lineHeight:1, filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}>🏆</div>
              </div>
              {/* Bottom dark band */}
              <div style={{
                background:"rgba(10,20,10,0.92)",
                padding:"14px 22px",
                display:"flex", alignItems:"center", gap:12,
              }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🥇</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.5 }}>
                  Le <span style={{ fontWeight:900, color:"#fbbf24" }}>meilleur pronostiqueur</span> à la fin de la Coupe du Monde repart avec le maillot de son choix.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: SIGNUP ── */}
        {authStep === "signup" && (
          <div style={{ ...card, padding:"24px" }}>
            <div style={{ fontSize:16, fontWeight:800, color: TEXT, marginBottom:4 }}>Créer mon profil</div>
            <div style={{ fontSize:12, color: MUTED, marginBottom:20 }}>Ton email garantit l'unicité de ton profil.</div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color: MUTED, textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:6 }}>Prénom</label>
              <input style={inputS} placeholder="Ton prénom..." value={signupName}
                onChange={e => { setSignupName(e.target.value); setSignupError(""); }}
                onKeyDown={e => e.key === "Enter" && document.getElementById("emailInput")?.focus()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color: MUTED, textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:6 }}>Email</label>
              <input id="emailInput" style={inputS} type="email" placeholder="ton@email.com" value={signupEmail}
                onChange={e => { setSignupEmail(e.target.value); setSignupError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSignup()} />
              <div style={{ fontSize:11, color: MUTED, marginTop:6 }}>🔒 Utilisé uniquement pour vérifier ton identité.</div>
            </div>

            {signupError && (
              <div style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.3)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#dc2626", fontWeight:600, marginBottom:16 }}>
                {signupError}
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button style={{ ...btnS("ghost"), flex:1, border:"1px solid rgba(0,0,0,0.15)" }} onClick={() => setAuthStep("home")}>Retour</button>
              <button style={{ ...btnS("primary"), flex:2 }} onClick={handleSignup}>Créer mon profil ⚽</button>
            </div>
          </div>
        )}

      </div>
    </>
  );

  // ─── MATCHES ─────────────────────────────────────
  if (view === "matches") return pageWrap(
    <>
      <div style={{ maxWidth:720, margin:"0 auto" }}>
        {myStats && (
          <div className="stats-bar" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:16 }}>
            {[
              { label:"Classement",  val:`#${myRank}`, hex:"#b45309", hide:false },
              { label:"Points",      val:myStats.pts,  hex: G, hide:false },
              { label:"🏆 Exacts",   val:myStats.exact,  hex:"#15803d", hide:false },
              { label:"🎯 Écarts",   val:myStats.ecart,  hex:"#0d9488", hide:true },
              { label:"⚡ Partiels", val:myStats.partial, hex:"#1d4ed8", hide:true },
            ].map(s => (
              <div key={s.label} className={s.hide?"stat-hidden":""} style={{ ...card, padding:"8px 4px", textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.hex }}>{s.val}</div>
                <div style={{ fontSize:9, color: MUTED, marginTop:1, lineHeight:1.2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Indicateur connexion + bouton reload */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
            background: sbMode==="supabase" ? "rgba(21,128,61,0.85)" : "rgba(180,83,9,0.85)",
            color:"#fff" }}>
            {sbMode === "supabase" ? "🟢 Connecté" : "🟡 Mode local"}
          </span>
          <button style={{ fontSize:11, color:"rgba(255,255,255,0.8)", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"4px 12px", cursor:"pointer" }}
            onClick={async () => {
              // Force reconnexion Supabase même si on était en mode local
              try {
                const [pl, pr, sc] = await Promise.all([
                  sbSelect("players"),
                  sbSelect("predictions"),
                  sbSelect("real_scores"),
                ]);
                if (Array.isArray(pl)) {
                  storageMode.current = "supabase";
                  setSbMode("supabase");
                  setPlayers(pl);
                  const predsFromDb = {};
                  (pr||[]).forEach(r => { predsFromDb[`${r.player_id}_${r.match_id}`] = { s1: r.score1, s2: r.score2 }; });
                  setPreds(predsFromDb);
                  const scoresMap = {};
                  (sc||[]).forEach(r => { scoresMap[r.match_id] = { s1: r.score1, s2: r.score2 }; });
                  setRealScores(scoresMap);
                }
              } catch(e) { console.warn("Reload failed:", e); }
            }}>
            🔄 Recharger
          </button>
        </div>

        {/* Phase toggle */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {[["groupes","⚽ Phase de groupes"],["finale","🏆 Phase finale"]].map(([ph, label]) => (
            <button key={ph} onClick={()=>setFilterPhase(ph)} style={{ flex:1, ...navBtnS(filterPhase===ph), fontSize:13, background: filterPhase===ph?"#15803d":"rgba(255,255,255,0.7)", color: filterPhase===ph?"#fff":TEXT }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Indicateur de complétion des pronos ── */}
        {me && filterPhase === "groupes" && (() => {
          const total = ALL_MATCHES.length; // 72
          const filled = ALL_MATCHES.filter(m => {
            const p = effectivePreds[`${me.id}_${m.id}`];
            return p !== undefined && p.s1 !== undefined && p.s2 !== undefined;
          }).length;
          const locked = ALL_MATCHES.filter(m => isMatchLocked(m)).length;
          const missing = total - filled;
          const pct = Math.round((filled / total) * 100);
          const allDone = missing === 0;

          return (
            <div style={{ marginBottom:14 }}>
              {/* Barre de progression */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.8)" }}>
                  Mes pronostics : <strong style={{ color: allDone ? "#4ade80" : "#fbbf24" }}>{filled}/{total}</strong>
                </span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{pct}%</span>
              </div>
              <div style={{ height:8, borderRadius:8, background:"rgba(255,255,255,0.15)", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:8, width:`${pct}%`, transition:"width 0.4s",
                  background: allDone
                    ? "linear-gradient(90deg,#15803d,#4ade80)"
                    : pct > 50
                    ? "linear-gradient(90deg,#b45309,#fbbf24)"
                    : "linear-gradient(90deg,#dc2626,#f87171)"
                }}/>
              </div>

              {/* Message d'alerte si pronos manquants */}
              {!allDone && (
                <div style={{ marginTop:10, borderRadius:12, overflow:"hidden",
                  border:`1.5px solid ${missing > 20 ? "rgba(220,38,38,0.5)" : "rgba(251,191,36,0.5)"}` }}>
                  <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10,
                    background: missing > 20 ? "rgba(220,38,38,0.12)" : "rgba(251,191,36,0.12)" }}>
                    <span style={{ fontSize:20 }}>{missing > 20 ? "🚨" : "⚠️"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800, color: missing > 20 ? "#f87171" : "#fbbf24" }}>
                        {missing} pronostic{missing > 1 ? "s" : ""} manquant{missing > 1 ? "s" : ""} !
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
                        {locked > 0
                          ? `${locked} match${locked>1?"s":""} déjà verrouillé${locked>1?"s":""}. Remplis les ${missing - Math.max(0, ALL_MATCHES.filter(m=>isMatchLocked(m)&&!effectivePreds[`${me.id}_${m.id}`]).length)} restants avant le coup d'envoi !`
                          : `Remplis-les avant le début des matchs — ils se verrouillent au coup d'envoi !`
                        }
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Filtre sur les matchs non remplis
                        setFilterMD("all");
                        setFilterG("all");
                        // Scroll vers le premier match non rempli
                        const firstEmpty = ALL_MATCHES.find(m => !effectivePreds[`${me.id}_${m.id}`] && !isMatchLocked(m));
                        if (firstEmpty) {
                          setTimeout(() => {
                            const el = document.getElementById(`match-card-${firstEmpty.id}`);
                            if (el) el.scrollIntoView({ behavior:"smooth", block:"center" });
                          }, 100);
                        }
                      }}
                      style={{ fontSize:11, fontWeight:800, color:"#fff",
                        background: missing > 20 ? "#dc2626" : "#b45309",
                        border:"none", borderRadius:20, padding:"6px 14px", cursor:"pointer", flexShrink:0 }}>
                      Voir →
                    </button>
                  </div>
                </div>
              )}

              {/* Message succès si tout est rempli */}
              {allDone && (
                <div style={{ marginTop:8, borderRadius:10, padding:"8px 14px", background:"rgba(21,128,61,0.15)", border:"1px solid rgba(21,128,61,0.3)", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>✅</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#4ade80" }}>Tous tes pronostics sont remplis — bonne chance ! 🦜</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Filters groupes */}
        {filterPhase === "groupes" && <>
          <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:4 }}>
            {["all","1","2","3"].map(md=>(
              <button key={md} style={{ ...navBtnS(filterMD===md), flexShrink:0, fontSize:12, background: filterMD===md?"#15803d":"rgba(255,255,255,0.7)", color: filterMD===md?"#fff":TEXT }}
                onClick={()=>setFilterMD(md)}>{md==="all"?"Tous":"Journée "+md}</button>
            ))}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
            {["all",...Object.keys(GROUPS).map(g=>`Groupe ${g}`)].map(g=>(
              <button key={g} style={{ ...navBtnS(filterG===g), fontSize:11, background: filterG===g?"#15803d":"rgba(255,255,255,0.7)", color: filterG===g?"#fff":TEXT }}
                onClick={()=>setFilterG(g)}>{g==="all"?"Tous":g}</button>
            ))}
          </div>
        </>}

        {/* ── Matchs selon la phase ── */}
        {(() => {
          const inputStyle = { width:52, height:52, borderRadius:12, border:`2.5px solid ${G}`, background:"rgba(21,128,61,0.07)", textAlign:"center", fontSize:26, fontWeight:900, color:G, outline:"none", MozAppearance:"textfield" };

          const roundColors = {
            "32es de finale": { bg:"rgba(20,50,70,0.9)",  color:"#7dd3fc" },
            "16es de finale": { bg:"rgba(30,58,90,0.9)",  color:"#38bdf8" },
            "Quarts":         { bg:"rgba(26,26,74,0.9)",  color:"#818cf8" },
            "Demi-finales":   { bg:"rgba(42,26,74,0.9)",  color:"#c084fc" },
            "Petite finale":  { bg:"rgba(26,42,26,0.9)",  color:"#4ade80" },
            "Finale":         { bg:"rgba(58,32,0,0.9)",   color:"#fbbf24" },
          };

          const renderMatch = (m) => {
            const isKo = m.id >= 1001;
            // Résolution des équipes KO :
            // Si le nom est hardcodé (non vide) dans KNOCKOUT_MATCHES → priorité absolue
            // Si vide → utiliser l'override manuel admin (koTeams)
            const resolveTeam = (side) => {
              const hardcoded = side === "team1" ? m.team1 : m.team2;
              if (hardcoded && hardcoded.trim()) return hardcoded; // Hardcodé = vérité terrain
              const manual = koTeams[m.id]?.[side];
              if (manual && manual.trim()) return manual; // Override admin pour slots inconnus
              return "";
            };
            const t1str = isKo ? resolveTeam("team1") : m.team1;
            const t2str = isKo ? resolveTeam("team2") : m.team2;
            const t1 = splitTeam(t1str);
            const t2 = splitTeam(t2str);
            const pred = myPred(m);
            const real = realScores[m.id];
            const pts  = myPts(m);
            const meta = pts !== null ? ptsMeta(pts) : null;
            // Prono IA : uniquement le vrai compte cocoprono-ia
            const aiPred = preds[`cocoprono-ia_${m.id}`] || null;
            const aiPts  = calcPts(aiPred, real);
            const aiMeta = aiPts !== null ? ptsMeta(aiPts) : null;
            const local  = inlineInputs[m.id] ?? {};
            const v1 = local.s1 !== undefined ? local.s1 : (pred !== undefined ? String(pred.s1) : "");
            const v2 = local.s2 !== undefined ? local.s2 : (pred !== undefined ? String(pred.s2) : "");
            const previewPts  = (v1!==""&&v2!==""&&real) ? calcPts({s1:parseInt(v1),s2:parseInt(v2)},real) : null;
            const previewMeta = previewPts !== null ? ptsMeta(previewPts) : meta;
            const locked = isMatchLocked(m);
            const mss = matchSaveStatus[m.id]; // "saving"|"saved"|"error"|undefined

            const iStyle = {
              width:52, height:52, borderRadius:12,
              border:`2.5px solid ${locked ? "rgba(150,150,150,0.3)" : G}`,
              background: locked ? "rgba(200,200,200,0.2)" : "rgba(21,128,61,0.07)",
              textAlign:"center", fontSize:26, fontWeight:900,
              color: locked ? "#999" : G, outline:"none", MozAppearance:"textfield",
              cursor: locked ? "not-allowed" : "text",
            };
            const iClass = "score-input";

            const FlagBox = ({t}) => (
              <div className="match-flag" style={{ width:72, height:52, borderRadius:8, background:"rgba(255,255,255,0.85)", border:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.12)", overflow:"hidden", flexShrink:0 }}>
                {t.imgUrl
                  ? <img src={t.imgUrl} alt={t.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <span className="match-flag-emoji" style={{ fontSize:44, lineHeight:1, fontFamily:"'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif" }}>{t.emoji}</span>
                }
              </div>
            );

            const ScoreBox = ({v, onCh, onBl, otherV}) => locked
              ? <div style={{ width:52, height:52, borderRadius:12, background:"rgba(200,200,200,0.2)", border:"2px solid rgba(150,150,150,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:22, fontWeight:900, color:"#999" }}>{v !== "" ? v : "–"}</span>
                </div>
              : <input type="number" min="0" max="99" value={v} placeholder="–" style={iStyle} className={iClass}
                  onClick={e=>e.stopPropagation()} onChange={onCh} onBlur={onBl} onFocus={e=>e.target.select()} />;

            return (
              <div key={m.id} id={`match-card-${m.id}`} style={{
                ...card, marginBottom:10, padding:"14px 16px",
                background: locked ? "rgba(235,235,235,0.82)" : previewMeta ? `rgba(255,255,255,${previewMeta.color==="red"?0.82:0.88})` : "rgba(255,255,255,0.88)",
                borderLeft: locked ? "4px solid #bbb" : previewMeta ? `4px solid ${previewMeta.hex}` : "4px solid rgba(21,128,61,0.15)",
                opacity: locked ? 0.88 : 1,
              }}>
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    {m.group && <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"rgba(21,128,61,0.12)", color:G }}>{m.group}</span>}
                    {m.roundShort && <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"rgba(180,83,9,0.1)", color:GOLD }}>{m.roundShort}</span>}
                    {m.md && <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"rgba(180,83,9,0.1)", color:GOLD }}>J{m.md}</span>}
                    {locked
                      ? <span style={{ fontSize:11, fontWeight:700, color:"#888", display:"flex", alignItems:"center", gap:3 }}>🔒 Clôturé</span>
                      : m.time && <span style={{ fontSize:11, fontWeight:700, color:G, background:"rgba(21,128,61,0.08)", padding:"2px 8px", borderRadius:6 }}>⏱ {m.time}</span>
                    }
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    {!locked && previewMeta && <span style={{ ...pill(previewMeta), fontSize:11 }}>{previewMeta.icon} +{previewPts??pts}pt{(previewPts??pts)>1?"s":""}</span>}
                    {locked && meta && <span style={{ ...pill(meta), fontSize:11 }}>{meta.icon} +{pts}pt{pts>1?"s":""}</span>}
                    {/* Indicateur de sauvegarde */}
                    {mss === "saving" && <span style={{ fontSize:10, color:"rgba(251,191,36,0.9)", fontWeight:700, display:"flex", alignItems:"center", gap:3 }}>⏳</span>}
                    {mss === "saved"  && <span style={{ fontSize:10, color:"#4ade80", fontWeight:700 }}>✓ sauvegardé</span>}
                    {mss === "error"  && <span style={{ fontSize:10, color:"#f87171", fontWeight:700 }}>⚠ erreur</span>}
                    <span style={{ fontSize:11, color:MUTED }}>{m.date}/2026</span>
                  </div>
                </div>

                {/* Teams */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <FlagBox t={t1} />
                    <div style={{ fontWeight:800, fontSize:12, color:locked?"#777":TEXT, textAlign:"center", lineHeight:1.2, maxWidth:100 }}>{t1.name}</div>
                    <ScoreBox v={v1}
                      onCh={e=>setInlineInputs(prev=>({...prev,[m.id]:{...prev[m.id],s1:e.target.value}}))}
                      onBl={e=>{saveInlinePred(m.id, e.target.value, inlineInputs[m.id]?.s2??(pred!==undefined?String(pred.s2):undefined));}}
                      otherV={v2} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:60 }}>
                    {real ? (
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ ...scoreBox, width:32, height:32, fontSize:18, background:"rgba(21,128,61,0.08)", color:G }}>{real.s1}</div>
                        <div style={{ fontWeight:900, color:MUTED, fontSize:14 }}>-</div>
                        <div style={{ ...scoreBox, width:32, height:32, fontSize:18, background:"rgba(21,128,61,0.08)", color:G }}>{real.s2}</div>
                      </div>
                    ) : <div style={{ fontSize:11, fontWeight:800, color:"rgba(21,128,61,0.3)", letterSpacing:2 }}>VS</div>}
                    <div style={{ fontSize:10, color:MUTED, textAlign:"center" }}>{locked?"🔒 fermé":v1!==""&&v2!==""?"mon prono":"ton prono"}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <FlagBox t={t2} />
                    <div style={{ fontWeight:800, fontSize:12, color:locked?"#777":TEXT, textAlign:"center", lineHeight:1.2, maxWidth:100 }}>{t2.name}</div>
                    <ScoreBox v={v2}
                      onCh={e=>setInlineInputs(prev=>({...prev,[m.id]:{...prev[m.id],s2:e.target.value}}))}
                      onBl={e=>{saveInlinePred(m.id, inlineInputs[m.id]?.s1??(pred!==undefined?String(pred.s1):undefined), e.target.value);}}
                      otherV={v1} />
                  </div>
                </div>

                {/* Prono IA */}
                <div style={{ marginTop:10, paddingTop:10, borderTop:"1px dashed rgba(21,128,61,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:7, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🦜</div>
                    <span style={{ fontSize:12, fontWeight:700, color:MUTED }}>Pronostic CocoProno</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {aiPred ? <>
                      <span style={{ fontSize:22, fontWeight:900, color:"#b45309", letterSpacing:2 }}>{aiPred.s1} – {aiPred.s2}</span>
                      {aiMeta && <span style={{ ...pill(aiMeta), fontSize:11, padding:"2px 8px" }}>{aiMeta.icon} +{aiPts}pt{aiPts>1?"s":""}</span>}
                    </> : (
                      <span style={{ fontSize:13, color:"rgba(180,83,9,0.4)", fontStyle:"italic" }}>À venir…</span>
                    )}
                  </div>
                </div>

                {/* Sélecteur "Qui se qualifie ?" — uniquement pour les matchs KO */}
                {isKo && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px dashed rgba(21,128,61,0.2)" }}>
                    <div style={{ fontSize:9, color:MUTED, textAlign:"center", marginBottom:6, fontStyle:"italic" }}>
                      ⏱ Score final incl. prolongations · Hors tirs au but
                    </div>
                    <div style={{ fontSize:10, fontWeight:800, color:MUTED, textAlign:"center", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>
                      🏆 Qui se qualifie ? <span style={{ fontSize:9, color:"rgba(21,128,61,0.6)" }}>(+2pts bonus)</span>
                    </div>
                    {(() => {
                      const selW = myWinner(m);
                      const realW = realScores[m.id + KO_WINNER_OFFSET];
                      const realWinner = realW ? (realW.s1 > realW.s2 ? "team1" : "team2") : null;
                      const btnStyle = (side) => ({
                        flex:1, padding:"8px 6px", borderRadius:10, border:"none", cursor: locked ? "default" : "pointer",
                        fontWeight:800, fontSize:12, transition:"all 0.15s",
                        background: selW===side
                          ? (realWinner ? (realWinner===side ? "#15803d" : "#dc2626") : "#15803d")
                          : "rgba(255,255,255,0.85)",
                        color: selW===side ? "#fff" : "#1a3a1a",
                        boxShadow: selW===side ? "0 2px 8px rgba(0,0,0,0.25)" : "none",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                        opacity: locked && !selW ? 0.5 : 1,
                      });
                      return (
                        <div style={{ display:"flex", gap:8 }}>
                          <button style={btnStyle("team1")} onClick={() => !locked && saveWinner(m.id, "team1")}>
                            <span style={{ fontSize:16 }}>{t1.emoji}</span>
                            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:70 }}>{t1.name}</span>
                            {realWinner==="team1" && <span>✓</span>}
                          </button>
                          <button style={btnStyle("team2")} onClick={() => !locked && saveWinner(m.id, "team2")}>
                            {realWinner==="team2" && <span>✓</span>}
                            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:70 }}>{t2.name}</span>
                            <span style={{ fontSize:16 }}>{t2.emoji}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          };

          if (filterPhase === "groupes") {
            return <>
              {filtered.map(m => renderMatch(m))}
              {filtered.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.7)" }}>Aucun match pour ces filtres</div>}

              {/* ── Bouton Valider mes pronos ── */}
              {filtered.length > 0 && (
                <div style={{ position:"sticky", bottom:16, marginTop:16, zIndex:40 }}>
                  {/* Indicateur de connexion */}
                  <div style={{ textAlign:"center", marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                      background: sbMode==="supabase" ? "rgba(21,128,61,0.85)" : "rgba(180,83,9,0.85)",
                      color:"#fff" }}>
                      {sbMode === "supabase" ? "🟢 Connecté à Supabase" : "🟡 Mode local (non connecté à Supabase)"}
                    </span>
                  </div>
                  <button
                    onClick={saveAllPreds}
                    disabled={saveStatus === "saving"}
                    style={{
                      width:"100%", padding:"16px", borderRadius:16, border:"none",
                      cursor: saveStatus === "saving" ? "wait" : "pointer",
                      fontWeight:900, fontSize:16, letterSpacing:0.3,
                      transition:"all 0.2s",
                      background: saveStatus === "saved"
                        ? "linear-gradient(135deg,#15803d,#166534)"
                        : saveStatus === "partial"
                        ? "linear-gradient(135deg,#b45309,#92400e)"
                        : saveStatus === "error"
                        ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                        : "linear-gradient(135deg,#15803d,#0d9488)",
                      color:"#fff",
                      boxShadow: saveStatus === "saving" ? "none" : "0 4px 20px rgba(0,0,0,0.35)",
                      opacity: saveStatus === "saving" ? 0.75 : 1,
                    }}>
                    {saveStatus === "saving"  && "⏳ Sauvegarde en cours…"}
                    {saveStatus === "saved"   && "✅ Pronostics sauvegardés !"}
                    {saveStatus === "partial" && "⚠️ Sauvegarde partielle — réessaie"}
                    {saveStatus === "error"   && "❌ Erreur Supabase — vérifie ta connexion"}
                    {saveStatus === "idle"    && "💾 Valider mes pronostics"}
                  </button>
                </div>
              )}
            </>;
          }

          // ── Phase finale — arbre unifié ────────────────────────────────
          const CH = 62, CW = 138, GAP = 16, CONN = 26;
          const LC = "rgba(148,210,160,0.45)";

          // Carte de match du bracket
          const bc = (id, opts = {}) => {
            const m = ALL_KO_MATCHES.find(x => x.id === id);
            if (!m) return <div style={{width:CW,height:CH,borderRadius:10,background:"rgba(255,255,255,0.08)",border:"1.5px dashed rgba(255,255,255,0.15)"}} />;
            const resTeam = (side) => {
              const hc = side==="team1"?m.team1:m.team2;
              if (hc && hc.trim()) return hc; // Hardcodé = priorité absolue
              const man = koTeams[m.id]?.[side];
              return (man && man.trim()) ? man : "";
            };
            const t1s = resTeam("team1"); const t2s = resTeam("team2");
            const t1=splitTeam(t1s), t2=splitTeam(t2s);
            const real=realScores[m.id], pred=preds[me?`${me.id}_${m.id}`:null];
            const pts=calcPts(pred,real), meta=pts!==null?ptsMeta(pts):null;
            const locked=isMatchLocked(m);
            const known1 = Boolean(koTeams[m.id]?.team1 || !t1s.startsWith("🏳"));
            const known2 = Boolean(koTeams[m.id]?.team2 || !t2s.startsWith("🏳"));
            const winnerSide = real ? (real.s1 > real.s2 ? 1 : real.s2 > real.s1 ? 2 : 0) : 0;
            const row = (t, sc, pr, known, side) => (
              <div style={{
                display:"flex", alignItems:"center", gap:5, padding:"4px 7px",
                background: winnerSide===side ? "rgba(21,128,61,0.12)" : "transparent",
              }}>
                <span style={{fontSize:13,flexShrink:0,opacity:known?1:0.4}}>{t.emoji}</span>
                <span style={{
                  fontSize:9.5, fontWeight: winnerSide===side?800:600, flex:1,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  color: known ? (winnerSide===side?"#0f2d12":"#3a3a3a") : "#aaa",
                  fontStyle: known?"normal":"italic",
                }}>{t.name.length>13?t.name.slice(0,12)+"…":t.name}</span>
                <span style={{
                  fontSize:11.5, fontWeight:900, minWidth:14, textAlign:"right", flexShrink:0,
                  color: real!==undefined ? (winnerSide===side?"#15803d":"#888") : pr!==undefined ? "#b45309" : "#ccc",
                }}>{real!==undefined?sc:pr!==undefined?pr:"–"}</span>
              </div>
            );
            return (
              <div style={{
                width:CW, borderRadius:10, overflow:"hidden",
                background: meta ? "#ffffff" : "rgba(255,255,255,0.94)",
                border:`1.5px solid ${meta?meta.hex:locked?"rgba(150,150,150,0.5)":"rgba(21,128,61,0.25)"}`,
                boxShadow:"0 2px 10px rgba(0,0,0,0.18)",
              }}>
                <div style={{
                  fontSize:8, fontWeight:800, textAlign:"center", padding:"3px 4px",
                  background: meta ? `${meta.hex}1c` : "rgba(21,128,61,0.08)",
                  color: meta ? meta.hex : "#3a7a45", letterSpacing:0.3,
                }}>
                  {m.roundShort}{locked && !real ? " 🔒" : m.time ? " · "+m.date : ""}
                </div>
                {row(t1,real?.s1,pred?.s1,known1,1)}
                <div style={{height:1,background:"rgba(0,0,0,0.07)"}}/>
                {row(t2,real?.s2,pred?.s2,known2,2)}
                {meta && (
                  <div style={{textAlign:"center",fontSize:8.5,color:"#fff",fontWeight:800,padding:"2px",background:meta.hex}}>
                    {meta.icon} +{pts}pt{pts>1?"s":""}
                  </div>
                )}
              </div>
            );
          };

          // ── Construit l'arbre complet (32es → 16es → Quarts → Demi → Finale) ──
          const buildFullBracket = () => {
            // Ordre des 32es tel qu'ils s'enchaînent dans le tableau (paires adjacentes → match suivant)
            const leaves = [1001,1004, 1003,1006, 1002,1005, 1007,1008, 1012,1011, 1010,1009, 1015,1014, 1013,1016];
            const r1 = [1101,1102,1103,1104,1105,1106,1107,1108];
            const r2 = [1201,1202,1203,1204];
            const r3 = [1301,1302];

            const y0 = leaves.map((_,i) => i*(CH+GAP));
            const y1 = r1.map((_,i) => (y0[2*i]+y0[2*i+1])/2);
            const y2 = r2.map((_,i) => (y1[2*i]+y1[2*i+1])/2);
            const y3 = r3.map((_,i) => (y2[2*i]+y2[2*i+1])/2);
            const yFinale = (y3[0]+y3[1])/2;
            const yPetite = yFinale + CH + GAP*2.5;

            const X0=0, X1=CW+CONN, X2=2*(CW+CONN), X3=3*(CW+CONN), X4=4*(CW+CONN);
            const totalW = X4 + CW + 10;
            const totalH = Math.max(y0[y0.length-1], yPetite) + CH + 50;

            const cards = [
              ...leaves.map((id,i) => ({ id, x:X0, y:y0[i] })),
              ...r1.map((id,i) => ({ id, x:X1, y:y1[i] })),
              ...r2.map((id,i) => ({ id, x:X2, y:y2[i] })),
              ...r3.map((id,i) => ({ id, x:X3, y:y3[i] })),
              { id:1402, x:X4, y:yFinale, final:true },
              { id:1401, x:X4, y:yPetite, small:true },
            ];

            // Connecteurs en escalier (elbow) entre chaque paire parent/enfant
            const elbow = (xChild, yChildA, yChildB, xParent, yParent) => {
              const xMid = xChild + CW + (xParent - xChild - CW)/2;
              return [
                `M${xChild+CW},${yChildA+CH/2} H${xMid}`,
                `M${xChild+CW},${yChildB+CH/2} H${xMid}`,
                `M${xMid},${yChildA+CH/2} V${yChildB+CH/2}`,
                `M${xMid},${yParent+CH/2} H${xParent}`,
              ];
            };
            const paths = [];
            for (let i=0;i<r1.length;i++) paths.push(...elbow(X0,y0[2*i],y0[2*i+1],X1,y1[i]));
            for (let i=0;i<r2.length;i++) paths.push(...elbow(X1,y1[2*i],y1[2*i+1],X2,y2[i]));
            for (let i=0;i<r3.length;i++) paths.push(...elbow(X2,y2[2*i],y2[2*i+1],X3,y3[i]));
            paths.push(...elbow(X3,y3[0],y3[1],X4,yFinale));
            // Connecteur pointillé vers la petite finale (perdants des demies)
            const xMidP = X3+CW+(X4-X3-CW)/2;
            paths.push({ d:`M${X3+CW},${y3[0]+CH/2} H${xMidP} V${yPetite+CH/2} H${X4}`, dashed:true });
            paths.push({ d:`M${X3+CW},${y3[1]+CH/2} H${xMidP+8} V${yPetite+CH/2}`, dashed:true });

            const roundHeaders = [
              { x:X0, label:"32es" }, { x:X1, label:"16es" },
              { x:X2, label:"Quarts" }, { x:X3, label:"Demi" }, { x:X4, label:"Finale" },
            ];

            return (
              <div style={{ position:"relative" }}>
                {/* Indicateur de scroll horizontal */}
                <div style={{ position:"absolute", right:0, top:0, bottom:0, width:24, background:"linear-gradient(90deg,transparent,rgba(10,40,15,0.35))", pointerEvents:"none", zIndex:5, borderRadius:"0 12px 12px 0" }} />
                <div style={{ overflowX:"auto", paddingBottom:8, WebkitOverflowScrolling:"touch" }}>
                  <div style={{ position:"relative", width:totalW, height:totalH+30 }}>
                    {/* En-têtes de colonnes */}
                    {roundHeaders.map(({x,label}) => (
                      <div key={label} style={{
                        position:"absolute", left:x, top:0, width:CW, textAlign:"center",
                        fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.55)",
                        textTransform:"uppercase", letterSpacing:1,
                      }}>{label}</div>
                    ))}
                    <svg style={{ position:"absolute", left:0, top:30, width:totalW, height:totalH, pointerEvents:"none", overflow:"visible" }}>
                      {paths.map((p,i) => {
                        const d = typeof p === "string" ? p : p.d;
                        const dashed = typeof p === "object" && p.dashed;
                        return <path key={i} d={d} fill="none" stroke={dashed?"rgba(251,191,36,0.5)":LC} strokeWidth={dashed?1.3:1.8} strokeDasharray={dashed?"4,3":undefined} strokeLinecap="round" strokeLinejoin="round" />;
                      })}
                    </svg>
                    {cards.map(({id,x,y,final,small}) => (
                      <div key={id} style={{
                        position:"absolute", left:x, top:30+y,
                        transform: final ? "scale(1.12)" : small ? "scale(0.88)" : "none",
                        transformOrigin:"left center",
                        zIndex: final ? 3 : 1,
                      }}>
                        {small && <div style={{fontSize:8,fontWeight:800,color:"#fbbf24",marginBottom:2,textAlign:"center"}}>🥉 PETITE FINALE</div>}
                        {final && <div style={{fontSize:9,fontWeight:900,color:"#fbbf24",marginBottom:3,textAlign:"center",letterSpacing:1}}>🏆 FINALE</div>}
                        {bc(id)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          };

          const label = (txt) => (
            <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,paddingLeft:2}}>{txt}</div>
          );

          return (
            <>
              {/* Toggle liste / bracket */}
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button onClick={()=>setBracketView(false)} style={{...navBtnS(!bracketView),flex:1,fontSize:12,background:!bracketView?"#15803d":"rgba(255,255,255,0.7)",color:!bracketView?"#fff":TEXT}}>📋 Liste</button>
                <button onClick={()=>setBracketView(true)}  style={{...navBtnS(bracketView), flex:1,fontSize:12,background:bracketView?"#15803d":"rgba(255,255,255,0.7)",color:bracketView?"#fff":TEXT}}>🌳 Arbre</button>
              </div>

              {bracketView ? (
                /* ── VUE BRACKET — arbre unifié ── */
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", textAlign:"center", marginBottom:10 }}>
                    ↔ Fais glisser horizontalement pour voir tout le tableau
                  </div>
                  {buildFullBracket()}
                </div>
              ) : (
                /* ── VUE LISTE ── */
                <div>
                  {[...new Set(ALL_KO_MATCHES.map(m=>m.round))].map(round => {
                    const matches=ALL_KO_MATCHES.filter(m=>m.round===round);
                    const rc=roundColors[round]||{bg:"rgba(30,45,66,0.9)",color:"#e2e8f0"};
                    return (
                      <div key={round} style={{marginBottom:24}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.15)"}}/>
                          <div style={{padding:"6px 18px",borderRadius:20,background:rc.bg,color:rc.color,fontSize:13,fontWeight:800,border:`1px solid ${rc.color}55`,letterSpacing:0.5}}>
                            {round==="Finale"?"🏆 ":round==="Demi-finales"?"⚡ ":round==="Quarts"?"🎯 ":round==="16es de finale"?"⚽ ":round==="32es de finale"?"🌍 ":"🥉 "}{round}
                          </div>
                          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.15)"}}/>
                        </div>
                        {matches.map(m=>renderMatch(m))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </>
  );

  // ─── RANKING ─────────────────────────────────────
  if (view === "ranking") return pageWrap(
    <>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40 }}>🏆</div>
          <div style={{ fontSize:26, fontWeight:900, color:"#fbbf24", letterSpacing:"-0.5px" }}>Classement</div>
        </div>

        {/* Prize banner */}
        <div style={{
          marginBottom:20, borderRadius:16, overflow:"hidden",
          border:"1.5px solid rgba(251,191,36,0.5)",
          boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
        }}>
          <div style={{ background:"linear-gradient(135deg,#f59e0b,#fbbf24)", padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(0,0,0,0.4)", textTransform:"uppercase", letterSpacing:2 }}>Prix du vainqueur</div>
              <div style={{ fontSize:20, fontWeight:900, color:"#1c0a00" }}>Un maillot de ton choix 👕</div>
            </div>
            <div style={{ fontSize:44, lineHeight:1 }}>🏆</div>
          </div>
          <div style={{ background:"rgba(10,20,10,0.9)", padding:"9px 18px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:16 }}>🥇</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>
              Le <strong style={{ color:"#fbbf24" }}>meilleur pronostiqueur</strong> à la fin de la Coupe du Monde repart avec le maillot de son choix !
            </span>
          </div>
        </div>

        {leaderboard.length >= 3 && (
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:10, marginBottom:24 }}>
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p,i) => {
              const rank = i===0?2:i===1?1:3;
              const heights = [80,110,70];
              const golds = ["#9ba8b0","#f0b429","#cd7f32"];
              return (
                <div key={p.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg,${golds[i]},${golds[i]}aa)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"#fff", border:`3px solid ${golds[i]}` }}>{p.avatar}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#fff", textAlign:"center", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>{p.pts} pts</div>
                  <div style={{ width:"100%", height:heights[i], background:`rgba(255,255,255,${rank===1?0.25:0.18})`, backdropFilter:"blur(4px)", borderRadius:"10px 10px 0 0", border:"1px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:10 }}>
                    <span style={{ fontSize:26 }}>{rank===1?"🥇":rank===2?"🥈":"🥉"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Liste paginée ── */}
        {(() => {
          const myRankIdx = leaderboard.findIndex(p => p.id === me?.id);
          const myPage = myRankIdx >= 0 ? Math.floor(myRankIdx / RANK_PAGE_SIZE) : 0;
          // -1 = jamais cliqué → aller sur la page du joueur automatiquement
          const activePage = rankPage === -1 ? myPage : rankPage;
          const totalPages = Math.ceil(leaderboard.length / RANK_PAGE_SIZE);
          const pageStart = activePage * RANK_PAGE_SIZE;
          const pageItems = leaderboard.slice(pageStart, pageStart + RANK_PAGE_SIZE);
          const meOnThisPage = myRankIdx >= pageStart && myRankIdx < pageStart + RANK_PAGE_SIZE;

          return <>
            {/* Indicateur position */}
            {myRankIdx >= 0 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{leaderboard.length} participant{leaderboard.length>1?"s":""}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Ta position :</span>
                  <span style={{ fontSize:13, fontWeight:900, color:"#fbbf24", background:"rgba(251,191,36,0.15)", padding:"2px 10px", borderRadius:20 }}>
                    #{myRankIdx+1} / {leaderboard.length}
                  </span>
                  {!meOnThisPage && (
                    <button onClick={()=>setRankPage(myPage)}
                      style={{ fontSize:11, color:G, background:"rgba(21,128,61,0.15)", border:"1px solid rgba(21,128,61,0.3)", borderRadius:20, padding:"3px 10px", cursor:"pointer" }}>
                      Me voir →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lignes */}
            {pageItems.map((p, i) => {
              const gi = pageStart + i;
              const isMe = p.id === me?.id;
              return (
                <div key={p.id} style={{
                  display:"flex", alignItems:"center", gap:12, padding:"14px 18px", marginBottom:8, borderRadius:16,
                  ...(p.isAI ? {
                    background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
                    border:"2px solid #f59e0b",
                    boxShadow:"0 4px 24px rgba(251,191,36,0.5)",
                  } : {
                    ...card,
                    borderLeft: isMe ? "4px solid #15803d" : "4px solid transparent",
                    boxShadow: isMe ? "0 0 0 1px rgba(21,128,61,0.3)" : "none",
                  }),
                }}>
                  <div style={{ width:30, fontWeight:900, fontSize:15, textAlign:"center", color:p.isAI?"#78350f":gi===0?"#f0b429":gi===1?"#9ba8b0":gi===2?"#cd7f32":MUTED }}>{medalEmoji(gi)||`#${gi+1}`}</div>
                  <div style={{ width:p.isAI?46:38, height:p.isAI?46:38, borderRadius:"50%", flexShrink:0, background:p.isAI?"rgba(0,0,0,0.15)":"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:p.isAI?26:15, fontWeight:900, color:p.isAI?"#fff":"#0f2d12", border:p.isAI?"2px solid rgba(255,255,255,0.4)":"none" }}>{p.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontWeight:900, fontSize:p.isAI?18:15, color:p.isAI?"#1c0a00":TEXT }}>{p.name}</span>
                      {p.isAI && <span style={{ fontSize:11, fontWeight:800, color:"#f59e0b", background:"#1c0a00", padding:"2px 8px", borderRadius:10 }}>IA 🤖</span>}
                      {isMe && !p.isAI && <span style={{ fontSize:11, color:G, fontWeight:700 }}>(moi)</span>}
                    </div>
                    <div style={{ fontSize:12, marginTop:2, color:p.isAI?"#78350f":MUTED }}>🏆{p.exact} · 🎯{p.ecart} · ⚡{p.partial} · ✔{p.correct}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:p.isAI?28:22, fontWeight:900, color:p.isAI?"#1c0a00":G }}>{p.pts}</div>
                    <div style={{ fontSize:10, color:p.isAI?"#78350f":MUTED }}>pts</div>
                  </div>
                </div>
              );
            })}

            {leaderboard.length === 0 && <div style={{ textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.7)" }}>Aucun joueur pour l'instant</div>}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:16, flexWrap:"wrap" }}>
                <button onClick={()=>setRankPage(p=>Math.max(0,p-1))} disabled={activePage===0}
                  style={{ ...btnS("ghost"), padding:"8px 14px", fontSize:13, border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", opacity:activePage===0?0.4:1 }}>← Préc.</button>
                {Array.from({length:totalPages},(_,i)=>(
                  <button key={i} onClick={()=>setRankPage(i)}
                    style={{ width:34, height:34, borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:activePage===i?"#15803d":"rgba(255,255,255,0.15)", color:activePage===i?"#fff":"rgba(255,255,255,0.6)" }}>
                    {i+1}
                  </button>
                ))}
                <button onClick={()=>setRankPage(p=>Math.min(totalPages-1,p+1))} disabled={activePage===totalPages-1}
                  style={{ ...btnS("ghost"), padding:"8px 14px", fontSize:13, border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", opacity:activePage===totalPages-1?0.4:1 }}>Suiv. →</button>
              </div>
            )}

            {/* Bandeau sticky si joueur pas sur cette page */}
            {myRankIdx >= 0 && !meOnThisPage && (() => {
              const me_e = leaderboard[myRankIdx];
              return (
                <div style={{ position:"sticky", bottom:70, marginTop:12, background:"rgba(8,35,12,0.95)", backdropFilter:"blur(8px)", borderRadius:12, padding:"10px 14px", border:"1.5px solid rgba(21,128,61,0.4)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:900, color:"#fbbf24" }}>#{myRankIdx+1}</span>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#0f2d12" }}>{me_e.avatar}</div>
                  <span style={{ fontWeight:700, color:"#fff", flex:1, fontSize:13 }}>{me_e.name} <span style={{ color:G }}>(moi)</span></span>
                  <span style={{ fontWeight:900, color:G, fontSize:18 }}>{me_e.pts} pts</span>
                  <button onClick={()=>setRankPage(myPage)} style={{ fontSize:11, color:"#fff", background:"#15803d", border:"none", borderRadius:20, padding:"4px 12px", cursor:"pointer" }}>Voir →</button>
                </div>
              );
            })()}
          </>;
        })()}

        <div style={{ ...card, padding:"18px 20px", marginTop:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color: MUTED, textTransform:"uppercase", letterSpacing:2, marginBottom:14 }}>Système de points</div>
          {[
            [5,"green","🏆","Score exact","ex: 2-1 → 2-1"],
            [4,"teal", "🎯","Bon résultat + même écart","ex: 2-0 → 3-1"],
            [3,"blue", "⚡","Bon résultat + buts d'une équipe","ex: 2-1 → 2-0"],
            [2,"gold", "✔","Bon résultat seulement","ex: 0-1 → 1-4"],
            [0,"red",  "❌","Mauvais résultat",""],
          ].map(([pts,col,icon,label,ex])=>{
            const meta = ptsMeta(pts);
            return (
              <div key={pts} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ fontSize:15 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:700, color: TEXT }}>{label}</span>
                  {ex && <span style={{ fontSize:11, color: MUTED, marginLeft:6 }}>{ex}</span>}
                </div>
                <span style={pill(meta)}>{pts} pt{pts>1?"s":""}</span>
              </div>
            );
          })}
          <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(21,128,61,0.08)", borderRadius:8, fontSize:12, color: MUTED }}>
            Départage : points → exacts (5pts) → bons écarts (3pts)
          </div>
        </div>
      </div>
    </>
  );

  // ─── ADMIN ───────────────────────────────────────
  // Blocage admin pour les non-admins
  if (view === "admin" && !isAdmin) {
    return pageWrap(
      <div style={{ textAlign:"center", padding:"60px 20px" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🚫</div>
        <div style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:8 }}>Accès non autorisé</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", marginBottom:24 }}>Tu n'as pas accès à cette page.</div>
        <button style={{ ...btnS("primary") }} onClick={() => setView("matches")}>Retour aux matchs</button>
      </div>
    );
  }

  return pageWrap(
    <>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        {!adminOk ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🔐</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:24 }}>Accès administrateur</div>
            <div style={{ maxWidth:280, margin:"0 auto" }}>
              <input type="password" style={{ ...inputS, textAlign:"center", marginBottom:12 }}
                placeholder="Code admin..."
                value={adminPin} onChange={e=>{ setAdminPin(e.target.value); setAdminErr(false); }}
                onKeyDown={e=>{ if(e.key==="Enter"){ if(adminPin===ADMIN_CODE)setAdminOk(true); else setAdminErr(true); }}} />
              {adminErr && <div style={{ color:"#dc2626", fontSize:13, marginBottom:12, fontWeight:600 }}>Code incorrect</div>}
              <button style={{ ...btnS("primary"), width:"100%" }} onClick={()=>{ if(adminPin===ADMIN_CODE)setAdminOk(true); else setAdminErr(true); }}>Accéder</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:900, color:"#fbbf24" }}>⚙ Admin</div>
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...btnS("ghost"), fontSize:11, border:"1px solid rgba(21,128,61,0.4)", color:"#4ade80", padding:"6px 12px" }}
                  onClick={async () => {
                    try {
                      const [pl, pr, sc] = await Promise.all([
                        sbSelect("players"),
                        sbSelect("predictions"),
                        sbSelect("real_scores"),
                      ]);
                      console.log("Reload results:", pl?.length, "players,", pr?.length, "preds,", sc?.length, "scores");
                      if (Array.isArray(pl) && pl.length > 0) {
                        setPlayers(pl);
                        const predsFromDb = {};
                        (pr||[]).forEach(r => {
                          predsFromDb[`${r.player_id}_${r.match_id}`] = { s1: r.score1, s2: r.score2 };
                        });
                        setPreds(predsFromDb);
                        predsRef.current = predsFromDb;
                        const scoresMap = {};
                        (sc||[]).forEach(r => { scoresMap[r.match_id] = { s1: r.score1, s2: r.score2 }; });
                        setRealScores(scoresMap);
                        storageMode.current = "supabase";
                        setSbMode("supabase");
                        alert(`✅ Rechargé !\n👥 ${pl.length} joueurs\n📊 ${(pr||[]).length} pronos\n⚽ ${(sc||[]).length} scores`);
                      } else {
                        alert(`⚠️ Supabase a retourné ${pl?.length ?? 0} joueurs — connexion peut-être instable. Réessaie.`);
                      }
                    } catch(e) {
                      alert("❌ Erreur : " + e.message);
                    }
                  }}>
                  🔄 Tout recharger depuis Supabase
                </button>
                <button style={{ ...btnS("ghost"), fontSize:11, border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.6)", padding:"6px 10px" }}
                  onClick={async () => {
                    const pr = await sbSelect("predictions");
                    if (Array.isArray(pr)) {
                      const predsMap = {};
                      pr.forEach(r => { predsMap[`${r.player_id}_${r.match_id}`] = { s1: r.score1, s2: r.score2 }; });
                      setPreds(predsMap);
                    }
                  }}>🔄 Pronos</button>
                <button style={{ ...btnS("ghost"), border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)" }} onClick={()=>setAdminOk(false)}>Fermer</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
              {[["scores","⚽ Scores"],["ko","🏆 Finale"],["ia","🦜 IA"],["players","👥 Joueurs"]].map(([tab, label]) => (
                <button key={tab} onClick={()=>setAdminTab(tab)} style={{ ...navBtnS(adminTab===tab), fontSize:12, background: adminTab===tab?"#15803d":"rgba(255,255,255,0.75)", color: adminTab===tab?"#fff":TEXT, flex:1 }}>{label}</button>
              ))}
            </div>

            {/* ── TAB SCORES ── */}
            {adminTab === "scores" && <>
              {/* Toggle Groupes / Phase finale */}
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {[["groupes","⚽ Groupes"],["finale","🏆 Phase finale"]].map(([p,l])=>(
                  <button key={p} onClick={()=>setScorePhase(p)} style={{
                    flex:1, padding:"8px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:800, fontSize:13,
                    background: scorePhase===p ? "#15803d" : "rgba(255,255,255,0.75)",
                    color: scorePhase===p ? "#fff" : TEXT,
                  }}>{l}</button>
                ))}
              </div>

              {scorePhase === "groupes" && <>
                <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:6, flex:1 }}>
                    {["all","1","2","3"].map(md=>(
                      <button key={md} style={{ ...navBtnS(filterMD===md), flexShrink:0, fontSize:12, background: filterMD===md?"#15803d":"rgba(255,255,255,0.75)", color: filterMD===md?"#fff":TEXT }}
                        onClick={()=>setFilterMD(md)}>{md==="all"?"Tous":"J"+md}</button>
                    ))}
                  </div>
                  <button style={{ ...btnS("ghost"), fontSize:11, border:"1px solid rgba(255,193,7,0.4)", color:"#fbbf24", padding:"6px 12px", flexShrink:0 }}
                    onClick={simulateScores}>🧪 Simuler</button>
                  <button style={{ ...btnS("ghost"), fontSize:11, border:"1px solid rgba(220,38,38,0.4)", color:"#f87171", padding:"6px 12px", flexShrink:0 }}
                    onClick={resetGroupScores}>🗑 Reset</button>
                </div>
                {ALL_MATCHES.filter(m=>filterMD==="all"||m.md===+filterMD).map(m=>{
                  const real = realScores[m.id];
                  return (
                    <div key={m.id} style={{ ...card, display:"flex", alignItems:"center", gap:12, padding:"12px 16px", marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color: MUTED, marginBottom:2 }}>{m.group} · J{m.md} · {m.date}</div>
                        <div style={{ fontSize:13, fontWeight:700, color: TEXT }}>{m.team1} <span style={{ color: MUTED }}>vs</span> {m.team2}</div>
                      </div>
                      {real ? (
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:16, fontWeight:900, color: G }}>{real.s1}-{real.s2}</span>
                          <button style={{ ...btnS("ghost"), padding:"4px 10px", fontSize:12, border:"1px solid rgba(0,0,0,0.15)" }} onClick={()=>openReal(m)}>Modifier</button>
                        </div>
                      ) : (
                        <button style={{ ...btnS("primary"), padding:"6px 14px", fontSize:12 }} onClick={()=>openReal(m)}>Entrer</button>
                      )}
                    </div>
                  );
                })}
              </>}

              {scorePhase === "finale" && <>
                {[...new Set(ALL_KO_MATCHES.map(m=>m.round))].map(round => {
                  const roundMatches = ALL_KO_MATCHES.filter(m=>m.round===round);
                  const roundColors = {
                    "32es de finale":"#7dd3fc","16es de finale":"#38bdf8",
                    "Quarts":"#818cf8","Demi-finales":"#c084fc",
                    "Petite finale":"#4ade80","Finale":"#fbbf24",
                  };
                  const color = roundColors[round] || "#94a3b8";
                  return (
                    <div key={round} style={{ marginBottom:20 }}>
                      <div style={{ fontSize:11, fontWeight:800, color, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>
                        {round}
                      </div>
                      {roundMatches.map(m => {
                        const t1name = (m.team1 && m.team1.trim()) ? m.team1 : (koTeams[m.id]?.team1 || "");
                        const t2name = (m.team2 && m.team2.trim()) ? m.team2 : (koTeams[m.id]?.team2 || "");
                        const t1 = splitTeam(t1name);
                        const t2 = splitTeam(t2name);
                        const real = realScores[m.id];
                        const realW = realScores[m.id + KO_WINNER_OFFSET];
                        const realWinner = realW ? (realW.s1 > realW.s2 ? "team1" : "team2") : null;
                        const hasTeams = t1name && t2name;
                        const locked = isMatchLocked(m);
                        return (
                          <div key={m.id} style={{
                            ...card, display:"flex", alignItems:"center", gap:10,
                            padding:"12px 14px", marginBottom:8, opacity: hasTeams ? 1 : 0.5,
                            borderLeft: real ? `4px solid ${G}` : locked ? "4px solid rgba(150,150,150,0.4)" : "4px solid rgba(21,128,61,0.2)",
                          }}>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, minWidth:28 }}>
                              <span style={{ fontSize:8, fontWeight:800, color, background:"rgba(255,255,255,0.12)", borderRadius:4, padding:"1px 4px" }}>{m.roundShort}</span>
                              <span style={{ fontSize:9, color:MUTED }}>{m.date}</span>
                              <span style={{ fontSize:9, color:MUTED }}>{m.time}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6 }}>
                                <div style={{ fontSize:12, fontWeight:700, color: realWinner==="team1"?G:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {t1.emoji} {t1.name || "À déterm."}
                                  {realWinner==="team1" && <span style={{color:G, marginLeft:4}}>✓</span>}
                                </div>
                                <div style={{ fontSize:13, fontWeight:900, color: real?G:MUTED, flexShrink:0 }}>
                                  {real ? `${real.s1}–${real.s2}` : "–"}
                                </div>
                                <div style={{ fontSize:12, fontWeight:700, color: realWinner==="team2"?G:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right" }}>
                                  {realWinner==="team2" && <span style={{color:G, marginRight:4}}>✓</span>}
                                  {t2.name || "À déterm."} {t2.emoji}
                                </div>
                              </div>
                              {real && realWinner && (
                                <div style={{ fontSize:10, color:G, marginTop:3, textAlign:"center" }}>
                                  🏆 Qualifié : {realWinner==="team1"?t1.name:t2.name}
                                  {realWinner && real.s1===real.s2 ? " (TAB)" : ""}
                                </div>
                              )}
                            </div>
                            <div style={{ flexShrink:0 }}>
                              {real ? (
                                <button style={{ ...btnS("ghost"), padding:"4px 10px", fontSize:11, border:"1px solid rgba(0,0,0,0.15)" }}
                                  onClick={()=>openReal(m)}>Modifier</button>
                              ) : (
                                <button
                                  style={{ ...btnS("primary"), padding:"6px 12px", fontSize:11, opacity: hasTeams ? 1 : 0.4 }}
                                  disabled={!hasTeams}
                                  onClick={()=>hasTeams && openReal(m)}>Entrer</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>}
            </>}

            {/* ── TAB KO TEAMS ── */}
            {adminTab === "ko" && <>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:12, lineHeight:1.5, background:"rgba(21,128,61,0.1)", borderRadius:10, padding:"10px 14px" }}>
                ✨ <strong style={{color:"#fbbf24"}}>Remplissage automatique</strong> — les équipes qualifiées sont calculées automatiquement dès que tous les scores de groupes sont saisis.<br/>
                Tu peux corriger manuellement en cas d'erreur — tes corrections sont prioritaires.
              </div>

              {/* Résumé des qualifiés par groupe */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:2, marginBottom:8 }}>Qualifiés calculés</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                  {Object.entries(GROUPS).map(([g]) => {
                    const gs = groupStandings[g];
                    const t1 = qualified[`1${g}`], t2 = qualified[`2${g}`];
                    const t3 = gs?.teams[2];
                    const isComplete = gs?.complete;
                    const f1 = t1 ? splitTeam(t1) : null;
                    const f2 = t2 ? splitTeam(t2) : null;
                    return (
                      <div key={g} style={{ ...card, padding:"8px 10px", opacity: isComplete ? 1 : 0.5 }}>
                        <div style={{ fontSize:10, fontWeight:800, color:G, marginBottom:4 }}>Groupe {g}</div>
                        {isComplete ? <>
                          <div style={{ fontSize:11, color:TEXT }}>🥇 {f1?.emoji} {f1?.name || "?"}</div>
                          <div style={{ fontSize:11, color:TEXT }}>🥈 {f2?.emoji} {splitTeam(t2)?.name || "?"}</div>
                          <div style={{ fontSize:10, color:MUTED }}>3e {splitTeam(t3?.name)?.emoji} {splitTeam(t3?.name)?.name}</div>
                        </> : <div style={{ fontSize:10, color:MUTED }}>En attente des scores J3</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meilleurs 3es */}
              {thirds.length > 0 && (
                <div style={{ ...card, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>8 meilleurs 3es qualifiés</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {thirds.map((t,i) => {
                      const f = splitTeam(t);
                      return <span key={i} style={{ fontSize:12, background:"rgba(21,128,61,0.1)", border:"1px solid rgba(21,128,61,0.25)", borderRadius:8, padding:"3px 8px", color:TEXT }}>{f.emoji} {f.name}</span>;
                    })}
                  </div>
                </div>
              )}

              {/* Corrections manuelles 32es de finale */}
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:2, marginBottom:8 }}>Corrections manuelles (32es de finale)</div>
              {ALL_KO_MATCHES.filter(m => m.round === "32es de finale").map(m => {
                const autoT1 = m.team1 && m.team1.trim() ? m.team1 : (koTeams[m.id]?.team1 || "");
                const autoT2 = m.team2 && m.team2.trim() ? m.team2 : (koTeams[m.id]?.team2 || "");
                return (
                  <div key={m.id} style={{ ...card, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:MUTED, marginBottom:6 }}>{m.roundShort} · {m.date}/2026</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 24px 1fr", gap:6, alignItems:"center" }}>
                      <div>
                        {autoT1 && !koTeams[m.id]?.team1 && <div style={{ fontSize:10, color:G, marginBottom:3 }}>Auto : {splitTeam(autoT1).emoji} {splitTeam(autoT1).name}</div>}
                        <input style={{ ...inputS, fontSize:12, padding:"6px 8px" }}
                          placeholder={autoT1 ? `✓ ${splitTeam(autoT1).name}` : m.team1}
                          value={koTeams[m.id]?.team1 || ""}
                          onChange={e => saveKoTeams({ ...koTeams, [m.id]: { ...koTeams[m.id], team1: e.target.value, team2: koTeams[m.id]?.team2 || "" } })}
                        />
                      </div>
                      <div style={{ textAlign:"center", fontWeight:900, color:MUTED }}>–</div>
                      <div>
                        {autoT2 && !koTeams[m.id]?.team2 && <div style={{ fontSize:10, color:G, marginBottom:3 }}>Auto : {splitTeam(autoT2).emoji} {splitTeam(autoT2).name}</div>}
                        <input style={{ ...inputS, fontSize:12, padding:"6px 8px" }}
                          placeholder={autoT2 ? `✓ ${splitTeam(autoT2).name}` : m.team2}
                          value={koTeams[m.id]?.team2 || ""}
                          onChange={e => saveKoTeams({ ...koTeams, [m.id]: { team1: koTeams[m.id]?.team1 || "", ...koTeams[m.id], team2: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>}

            {/* ── TAB IA ── */}
            {adminTab === "ia" && (() => {
              const iaKey = "cocoprono-ia";

              const ensureIaPlayer = async () => {
                if (!players.find(p => p.id === iaKey)) {
                  const iaPlayer = { id: iaKey, name: "CocoProno IA", email: "ia@cocoprono.app", avatar: "🦜" };
                  const nextPlayers = [...players, iaPlayer];
                  setPlayers(nextPlayers);
                  if (storageMode.current === "supabase") await sbInsert("players", iaPlayer);
                  else await storageSave("cp_players", nextPlayers);
                }
              };

              // Réinitialiser TOUS les pronos IA
              const resetIaPreds = async () => {
                if (!window.confirm("Supprimer tous les pronostics de CocoProno IA ? Cette action est irréversible.")) return;
                const next = { ...preds };
                Object.keys(next).filter(k => k.startsWith(iaKey + "_")).forEach(k => delete next[k]);
                setPreds(next);
                if (storageMode.current === "supabase") {
                  await fetch(`${SB_URL}/predictions?player_id=eq.${iaKey}`, {
                    method: "DELETE",
                    headers: sbH(),
                  });
                } else {
                  await storageSave("cp_preds", next);
                }
              };

              const saveIaPred = async (matchId, s1, s2) => {
                if (s1 === "" || s2 === "") return;
                const s1n = parseInt(s1), s2n = parseInt(s2);
                if (isNaN(s1n) || isNaN(s2n)) return;
                await ensureIaPlayer();
                const k = `${iaKey}_${matchId}`;
                const val = { s1: s1n, s2: s2n };
                // Mise à jour fonctionnelle — évite la closure stale
                setPreds(prev => ({ ...prev, [k]: val }));
                if (storageMode.current === "supabase") {
                  await sbUpsert("predictions", { player_id: iaKey, match_id: matchId, score1: s1n, score2: s2n });
                } else {
                  // Utilise predsRef pour avoir la valeur courante, pas la valeur capturée
                  await storageSave("cp_preds", { ...predsRef.current, [k]: val });
                }
              };

              const loginAsIa = async () => {
                await ensureIaPlayer();
                const iaPlayer = players.find(p => p.id === iaKey) || { id: iaKey, name: "CocoProno IA", email: "ia@cocoprono.app", avatar: "🦜" };
                if (storageMode.current === "supabase") localStorage.setItem("cp_me", iaKey);
                else try { await window.storage.set("cp_me", iaKey); } catch {}
                setMe(iaPlayer);
                setAdminOk(false);
                setView("matches");
              };

              const saveIaWinner = async (matchId, winner) => {
                await ensureIaPlayer();
                const val = winner === "team1" ? { s1:1, s2:0 } : { s1:0, s2:1 };
                const k = `${iaKey}_${matchId + KO_WINNER_OFFSET}`;
                setPreds(prev => ({ ...prev, [k]: val }));
                if (storageMode.current === "supabase") {
                  await sbUpsert("predictions", { player_id: iaKey, match_id: matchId + KO_WINNER_OFFSET, score1: val.s1, score2: val.s2 });
                } else {
                  await storageSave("cp_preds", { ...predsRef.current, [k]: val });
                }
              };

              const existingCount = Object.keys(preds).filter(k => k.startsWith(iaKey+"_") && parseInt(k.split("_")[1]) < KO_WINNER_OFFSET).length;

              // Tous les matchs à afficher (groupes + KO)
              const allMatchesToShow = [
                ...ALL_MATCHES.filter(m => filterMD==="all" || m.md===+filterMD),
                ...(filterMD==="all" ? ALL_KO_MATCHES : []),
              ];

              return (
                <div>
                  {/* Header + login button */}
                  <div style={{ ...card, padding:"16px 18px", marginBottom:16 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <div style={{ width:46, height:46, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🦜</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:900, fontSize:15, color:TEXT }}>CocoProno IA</div>
                        <div style={{ fontSize:12, color:MUTED }}>{existingCount}/{ALL_MATCHES.length + ALL_KO_MATCHES.length} pronostics saisis</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <button style={{ ...btnS("primary"), padding:"8px 14px", fontSize:12, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#0f2d12", fontWeight:900 }}
                          onClick={loginAsIa}>
                          🔑 Prendre le contrôle
                        </button>
                        {existingCount > 0 && (
                          <button style={{ ...btnS("danger"), padding:"6px 14px", fontSize:11 }}
                            onClick={resetIaPreds}>
                            🗑 Réinitialiser tous les pronos
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:MUTED, lineHeight:1.5, borderTop:"1px solid rgba(0,0,0,0.08)", paddingTop:10 }}>
                      💡 "Prendre le contrôle" te connecte en tant que CocoProno IA — saisis ses pronostics depuis la page Matchs comme n'importe quel joueur.<br/>
                      Tu peux aussi les remplir directement dans le tableau ci-dessous.
                    </div>
                  </div>

                  {/* Saisie directe match par match */}
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:2, marginBottom:10 }}>
                    Saisie directe des pronostics IA
                  </div>
                  <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto" }}>
                    {["all","1","2","3"].map(md=>(
                      <button key={md} style={{ ...navBtnS(filterMD===md), flexShrink:0, fontSize:12, background: filterMD===md?"#fbbf24":"rgba(255,255,255,0.75)", color: filterMD===md?"#0f2d12":TEXT }}
                        onClick={()=>setFilterMD(md)}>{md==="all"?"Tous":"J"+md}</button>
                    ))}
                  </div>

                  {allMatchesToShow.map(m => {
                    const k = `${iaKey}_${m.id}`;
                    const pred = preds[k];
                    const isKo = m.id >= 1001;
                    const resIA = (side) => {
                      const hc = side==="team1"?m.team1:m.team2;
                      if (hc && hc.trim()) return hc;
                      const man = koTeams[m.id]?.[side];
                      return (man && man.trim()) ? man : "";
                    };
                    const t1 = splitTeam(isKo ? resIA("team1") : m.team1);
                    const t2 = splitTeam(isKo ? resIA("team2") : m.team2);
                    const real = realScores[m.id];
                    const realW = isKo ? realScores[m.id + KO_WINNER_OFFSET] : null;
                    const realWinner = realW ? (realW.s1 > realW.s2 ? "team1" : "team2") : null;
                    const iaWinnerRaw = preds[`${iaKey}_${m.id + KO_WINNER_OFFSET}`];
                    const iaWinner = iaWinnerRaw ? (iaWinnerRaw.s1 > iaWinnerRaw.s2 ? "team1" : "team2") : null;
                    const pts = isKo
                      ? calcPtsKO(pred, real, iaWinner, realWinner)
                      : calcPts(pred, real);
                    const meta = pts !== null ? ptsMeta(pts) : null;
                    const inputSt = (hasPred) => ({ width:50, height:50, borderRadius:12, border:`2.5px solid ${hasPred?"#fbbf24":"rgba(251,191,36,0.25)"}`, background:"rgba(251,191,36,0.07)", textAlign:"center", fontSize:24, fontWeight:900, color:"#b45309", outline:"none", MozAppearance:"textfield" });
                    return (
                      <div key={m.id} style={{ ...card, padding:"12px 14px", marginBottom:8,
                        borderLeft: meta ? `4px solid ${meta.hex}` : pred ? "4px solid #fbbf24" : "4px solid rgba(251,191,36,0.15)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div style={{ display:"flex", gap:6 }}>
                            {isKo
                              ? <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"rgba(251,191,36,0.15)", color:"#b45309" }}>{m.roundShort}</span>
                              : <><span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"rgba(21,128,61,0.12)", color:G }}>{m.group}</span>
                                 <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"rgba(180,83,9,0.1)", color:GOLD }}>J{m.md}</span></>
                            }
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            {meta && <span style={{ ...pill(meta), fontSize:11 }}>{meta.icon} +{pts}pt{pts>1?"s":""}</span>}
                            {real && <span style={{ fontSize:11, fontWeight:700, color:G }}>Score : {real.s1}-{real.s2}</span>}
                          </div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8 }}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:22 }}>{t1.emoji}</span>
                            <span style={{ fontSize:11, fontWeight:700, color:TEXT, textAlign:"center" }}>{t1.name}</span>
                            <input type="number" min="0" max="99"
                              value={pred?.s1 ?? ""}
                              placeholder="–"
                              onChange={e => { const v=e.target.value; if(v===""||isNaN(parseInt(v))) return; saveIaPred(m.id, parseInt(v), pred?.s2 ?? 0); }}
                              onFocus={e => e.target.select()}
                              style={inputSt(!!pred)} />
                          </div>
                          <div style={{ textAlign:"center", fontSize:13, fontWeight:800, color:MUTED }}>–</div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:22 }}>{t2.emoji}</span>
                            <span style={{ fontSize:11, fontWeight:700, color:TEXT, textAlign:"center" }}>{t2.name}</span>
                            <input type="number" min="0" max="99"
                              value={pred?.s2 ?? ""}
                              placeholder="–"
                              onChange={e => { const v=e.target.value; if(v===""||isNaN(parseInt(v))) return; saveIaPred(m.id, pred?.s1 ?? 0, parseInt(v)); }}
                              onFocus={e => e.target.select()}
                              style={inputSt(!!pred)} />
                          </div>
                        </div>

                        {/* Sélecteur qualifié pour les matchs KO */}
                        {isKo && (
                          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px dashed rgba(251,191,36,0.25)" }}>
                            <div style={{ fontSize:9, fontWeight:800, color:"#b45309", textAlign:"center", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>
                              🏆 Qualifié ? <span style={{ color:MUTED, fontWeight:600 }}>(+2pts)</span>
                            </div>
                            <div style={{ display:"flex", gap:6 }}>
                              {[["team1",t1],["team2",t2]].map(([side,t]) => (
                                <button key={side} onClick={() => saveIaWinner(m.id, side)}
                                  style={{
                                    flex:1, padding:"6px 4px", borderRadius:8, border:"none", cursor:"pointer",
                                    fontWeight:800, fontSize:10, transition:"all 0.15s",
                                    background: iaWinner===side
                                      ? (realWinner ? (realWinner===side?"#15803d":"#dc2626") : "#b45309")
                                      : "rgba(255,255,255,0.85)",
                                    color: iaWinner===side ? "#fff" : "#3a2a00",
                                    display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                                  }}>
                                  <span style={{ fontSize:14 }}>{t.emoji}</span>
                                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:55 }}>{t.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {adminTab === "players" && <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>{players.length} participant{players.length>1?"s":""} inscrit{players.length>1?"s":""}</div>
                <button style={{ ...btnS("primary"), padding:"7px 14px", fontSize:12 }} onClick={() => {
                  const header = "Rang,Prénom,Email,Points,Exacts,Écarts,Partiels,Corrects";
                  const rows = leaderboard.filter(p=>!p.isAI).map((p,i) =>
                    `${i+1},${p.name},${p.email||"—"},${p.pts},${p.exact},${p.ecart},${p.partial},${p.correct}`
                  );
                  navigator.clipboard.writeText([header,...rows].join("\n"));
                }}>📋 Copier CSV</button>
              </div>

              {/* Table header */}
              <div style={{ ...card, padding:"10px 16px", marginBottom:4, display:"grid", gridTemplateColumns:"28px 1fr 1fr auto", gap:12, alignItems:"center" }}>
                {["#","Prénom","Email","Pts"].map(h => (
                  <div key={h} style={{ fontSize:11, fontWeight:700, color: MUTED, textTransform:"uppercase", letterSpacing:1 }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {leaderboard.filter(p=>!p.isAI).map((p,i) => (
                <div key={p.id} style={{ ...card, padding:"12px 16px", marginBottom:6, display:"grid", gridTemplateColumns:"28px 1fr 1fr auto", gap:12, alignItems:"center", borderLeft: me?.id===p.id?"4px solid #15803d":"4px solid transparent" }}>
                  <div style={{ fontSize:14, fontWeight:900, color: i===0?"#f0b429":i===1?"#9ba8b0":i===2?"#cd7f32":MUTED }}>{medalEmoji(i)||`#${i+1}`}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#0f2d12", flexShrink:0 }}>{p.avatar}</div>
                    <span style={{ fontSize:14, fontWeight:700, color: TEXT }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize:12, color: MUTED, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.email || "—"}</div>
                  <div style={{ fontSize:16, fontWeight:900, color: G, textAlign:"right" }}>{p.pts}</div>
                </div>
              ))}

              {players.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.5)" }}>Aucun participant pour l'instant</div>
              )}
            </>}
          </div>
        )}
      </div>

      {/* REAL SCORE MODAL */}
      {editReal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}
          onClick={e=>{ if(e.target===e.currentTarget) setEditReal(null); }}>
          <div style={{ ...card, width:"100%", maxWidth:340, padding:24 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color: MUTED, marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>
                {editReal.id >= 1001 ? "Score final (incl. prolongations)" : "Score réel"}
              </div>
              {editReal.id >= 1001 && (
                <div style={{ fontSize:10, color:MUTED, marginBottom:6, fontStyle:"italic" }}>
                  ⏱ Prolongations incluses · Ne pas compter les TAB
                </div>
              )}
              <div style={{ fontSize:15, fontWeight:800, color: TEXT }}>{editReal.team1} vs {editReal.team2}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:10, marginBottom:20 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ fontSize:12, color: MUTED }}>{editReal.team1.split(" ").slice(-1)[0]}</div>
                <input
                  type="number" min="0" max="99"
                  value={rInput.s1 === "" ? "" : rInput.s1}
                  onChange={e => { const v = e.target.value; setRInput(p => ({...p, s1: v === "" ? "" : Math.max(0, parseInt(v)||0)})); }}
                  onFocus={e => e.target.select()}
                  style={{ width:72, height:72, borderRadius:16, border:`2.5px solid ${GOLD}`, background:"rgba(180,83,9,0.07)", textAlign:"center", fontSize:38, fontWeight:900, color: GOLD, outline:"none", MozAppearance:"textfield" }}
                />
              </div>
              <div style={{ fontSize:28, fontWeight:900, color: MUTED, textAlign:"center", paddingTop:18 }}>–</div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ fontSize:12, color: MUTED }}>{editReal.team2.split(" ").slice(-1)[0]}</div>
                <input
                  type="number" min="0" max="99"
                  value={rInput.s2 === "" ? "" : rInput.s2}
                  onChange={e => { const v = e.target.value; setRInput(p => ({...p, s2: v === "" ? "" : Math.max(0, parseInt(v)||0)})); }}
                  onFocus={e => e.target.select()}
                  style={{ width:72, height:72, borderRadius:16, border:`2.5px solid ${GOLD}`, background:"rgba(180,83,9,0.07)", textAlign:"center", fontSize:38, fontWeight:900, color: GOLD, outline:"none", MozAppearance:"textfield" }}
                />
              </div>
            </div>

            {/* Sélecteur vainqueur — uniquement pour les matchs KO */}
            {editReal.id >= 1001 && (
              <div style={{ marginBottom:16, padding:"12px", background:"rgba(180,83,9,0.07)", borderRadius:12, border:"1px solid rgba(180,83,9,0.2)" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#b45309", textAlign:"center", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>
                  🏆 Qui se qualifie ?
                  <span style={{ fontSize:9, color:MUTED, display:"block", fontWeight:600, marginTop:2, textTransform:"none" }}>Score final (90min + prol.) · Qualifié = vainqueur (incl. TAB)</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {[["team1", editReal.team1], ["team2", editReal.team2]].map(([side, name]) => (
                    <button key={side} onClick={() => setRInput(p => ({ ...p, winner: side }))}
                      style={{
                        flex:1, padding:"8px 6px", borderRadius:10, border:`1.5px solid ${rInput.winner===side?"#b45309":"rgba(0,0,0,0.12)"}`,
                        cursor:"pointer", fontWeight:800, fontSize:11,
                        background: rInput.winner===side ? "rgba(180,83,9,0.15)" : "rgba(0,0,0,0.04)",
                        color: rInput.winner===side ? "#b45309" : "#666",
                      }}>
                      {splitTeam(name).emoji} {splitTeam(name).name}
                      {rInput.winner===side && " ✓"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button style={{ ...btnS("ghost"), flex:1, border:"1px solid rgba(0,0,0,0.15)" }} onClick={()=>setEditReal(null)}>Annuler</button>
              <button style={{ ...btnS("gold"), flex:2 }} onClick={saveReal} disabled={rInput.s1===""||rInput.s2===""}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
