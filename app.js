import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import * as THREE from 'https://esm.sh/three@0.160.0';
import { animate, stagger } from 'https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm';

const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const NBA_LOGO = 'https://loodibee.com/wp-content/uploads/nba-logo-transparent.png';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const TEAM_LOGOS = {
  ATL: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/atl.png', BOS: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bos.png', BKN: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bkn.png',
  CHA: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/cha.png', CHI: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/chi.png', CLE: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/cle.png',
  DAL: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/dal.png', DEN: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/den.png', DET: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/det.png',
  GSW: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/gs.png', HOU: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/hou.png', IND: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/ind.png',
  LAC: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lac.png', LAL: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png', MEM: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mem.png',
  MIA: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mia.png', MIL: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/mil.png', MIN: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/min.png',
  NOP: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/no.png', NYK: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/ny.png', OKC: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/okc.png',
  ORL: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/orl.png', PHI: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/phi.png', PHX: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/phx.png',
  POR: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/por.png', SAC: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/sac.png', SAS: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/sa.png',
  TOR: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/tor.png', UTA: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/utah.png', WAS: 'https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/wsh.png',
};

const statusLabel = { pre: 'Upcoming', in: 'LIVE', post: 'Final' };
const fmtDate = (v) => new Date(v).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const parseWinPct = (record) => {
  const [w = '0', l = '0'] = (record || '').split('-');
  const wins = Number(w) || 0;
  const losses = Number(l) || 0;
  return wins + losses ? wins / (wins + losses) : 0.5;
};

const stars = (pct) => '★'.repeat(Math.max(1, Math.min(5, Math.round(pct * 5)))) + '☆'.repeat(5 - Math.max(1, Math.min(5, Math.round(pct * 5))));

const valueFromPct = (pct, bias = 0) => Math.max(72, Math.min(99, Math.round(70 + (pct * 27) + bias)));

const teamMetrics = (team) => {
  const p = parseWinPct(team.record);
  return {
    pace: 90 + Math.round(p * 18),
    threePct: 30 + Math.round(p * 10),
    fgPct: 42 + Math.round(p * 8),
    rebounds: 38 + Math.round(p * 12),
    formScore: Math.round(45 + p * 55),
  };
};

const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

function predictionForGame(game) {
  const homePct = parseWinPct(game.home.record);
  const awayPct = parseWinPct(game.away.record);
  const homeProbRaw = Math.max(0.3, Math.min(0.77, 0.5 + (homePct - awayPct) + 0.04));
  const homeProb = Math.round(homeProbRaw * 100);
  const awayProb = 100 - homeProb;
  const confidence = Math.round(Math.abs(homeProb - awayProb));
  return {
    homeProb,
    awayProb,
    pick: homeProb >= 55 ? `${game.home.short} ML` : awayProb >= 55 ? `${game.away.short} ML` : 'Wait for live line',
    confidence,
  };
}

function mapEvent(event) {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');

  const teamObj = (entry) => {
    const t = entry?.team || {};
    const record = entry?.records?.[0]?.summary || '-';
    const pct = parseWinPct(record);
    return {
      id: t.id,
      name: t.displayName || t.name,
      short: t.abbreviation || t.shortDisplayName,
      logo: TEAM_LOGOS[t.abbreviation] || t.logo,
      score: entry?.score ?? '-',
      record,
      color: t.color || '1d4ed8',
      altColor: t.alternateColor || '0ea5e9',
      linescore: entry?.linescores?.map((x) => x.value).join(' · ') || '--',
      strengthPct: Math.round(pct * 100),
      strength: `${stars(pct)} (${Math.round(pct * 100)}%)`,
      metrics: teamMetrics({ record }),
      roster: [],
    };
  };

  const leaders = (comp?.leaders || []).flatMap((l) => l.leaders || []).slice(0, 12).map((l) => ({
    name: l.athlete?.displayName || 'Unknown',
    headshot: l.athlete?.headshot?.href || '',
    stat: `${l.displayValue || ''} ${l.shortDisplayName || ''}`.trim(),
    team: l.team?.abbreviation || '',
  }));

  const insights = [
    `"${(away?.team?.abbreviation || 'AWAY')} must control pace to neutralize transition risk."`,
    `"${(home?.team?.abbreviation || 'HOME')} has home-court leverage in late-clock sets."`,
    '"Watch last-5-minute foul pressure before entering live props."',
  ];

  const game = {
    id: event.id,
    name: event.name,
    date: event.date,
    state: event.status?.type?.state || 'pre',
    statusText: event.status?.type?.detail || event.status?.type?.description || 'Scheduled',
    venue: comp?.venue?.fullName || 'NBA Arena',
    broadcast: comp?.broadcasts?.[0]?.names?.join(', ') || 'National Feed',
    odds: comp?.odds?.[0]?.details || 'Odds feed pending',
    overUnder: comp?.odds?.[0]?.overUnder || '--',
    home: teamObj(home),
    away: teamObj(away),
    leaders,
    quotes: insights,
    injuries: [...(home?.injuries || []), ...(away?.injuries || [])].slice(0, 5).map((i) => `${i.athlete?.displayName || 'Player'} (${i.status || 'status TBD'})`),
    lastPlay: comp?.situation?.lastPlay?.text || 'No last-play feed yet.',
  };
  game.prediction = predictionForGame(game);
  return game;
}

function ThreeBackdrop() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight('#7c9cff', 0.6));
    const light = new THREE.PointLight('#54d0ff', 1.5, 100);
    light.position.set(3, 2, 5);
    scene.add(light);

    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: '#2563eb', emissive: '#1d4ed8', emissiveIntensity: 0.5 }));
    const ring = new THREE.Mesh(new THREE.TorusKnotGeometry(2.1, 0.07, 160, 20), new THREE.MeshNormalMaterial({ wireframe: true }));
    const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.05, 16, 120), new THREE.MeshBasicMaterial({ color: '#22d3ee' }));
    pulseRing.rotation.x = 1.1;
    scene.add(orb, ring, pulseRing);

    const starsGeo = new THREE.BufferGeometry();
    const count = 1600;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = (Math.random() - 0.5) * 80;
      arr[i + 1] = (Math.random() - 0.5) * 80;
      arr[i + 2] = (Math.random() - 0.5) * 80;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const starsCloud = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: '#93c5fd', size: 0.05 }));
    scene.add(starsCloud);

    const clock = new THREE.Clock();
    let raf;
    const tick = () => {
      const t = clock.getElapsedTime();
      orb.rotation.x = t * 0.4;
      orb.rotation.y = t * 0.55;
      ring.rotation.y = t * 0.2;
      ring.rotation.x = t * 0.13;
      pulseRing.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06);
      starsCloud.rotation.y = t * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    tick();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      renderer.dispose();
      starsGeo.dispose();
    };
  }, []);
  return React.createElement('canvas', { className: 'three-bg', ref: canvasRef, 'aria-hidden': 'true' });
}

function TeamPanel({ team, side, gameState, onOpenTeam }) {
  return React.createElement('section', { className: `team-panel ${side}`, style: { '--c1': `#${team.color}`, '--c2': `#${team.altColor}` } },
    React.createElement('div', { className: 'team-header' },
      React.createElement('img', { src: team.logo, alt: `${team.name} logo` }),
      React.createElement('div', null,
        React.createElement('p', { className: 'side-tag' }, side.toUpperCase()),
        React.createElement('h3', null, team.name),
        React.createElement('p', { className: 'tiny' }, `Record: ${team.record}`),
      ),
    ),
    React.createElement('p', { className: 'strength' }, `Strength: ${team.strength}`),
    React.createElement('div', { className: `score-box ${gameState === 'in' ? 'live' : ''}` },
      React.createElement('span', null, gameState === 'post' ? 'Final Score' : 'Current Score'),
      React.createElement('strong', null, team.score),
    ),
    React.createElement('p', { className: 'tiny' }, `Quarter splits: ${team.linescore}`),
    React.createElement('button', { type: 'button', className: 'deep-btn', onClick: () => onOpenTeam(team) }, 'Open Full Team Intel'),
  );
}

function TeamIntelModal({ team, opponent, onClose }) {
  if (!team || !opponent) return null;
  const rows = [
    { key: 'Pace', a: team.metrics.pace, b: opponent.metrics.pace },
    { key: 'FG%', a: team.metrics.fgPct, b: opponent.metrics.fgPct },
    { key: '3PT%', a: team.metrics.threePct, b: opponent.metrics.threePct },
    { key: 'Rebounds', a: team.metrics.rebounds, b: opponent.metrics.rebounds },
    { key: 'Form Score', a: team.metrics.formScore, b: opponent.metrics.formScore },
  ];
  const roster = team.roster?.length ? team.roster : [
    { name: `${team.short} Starter 1`, pos: 'G', height: '6-3', rating: valueFromPct(team.strengthPct / 100, 2), three: `${team.metrics.threePct}%`, fp: `${Math.round(team.metrics.formScore / 2)} FP` },
    { name: `${team.short} Starter 2`, pos: 'G/F', height: '6-6', rating: valueFromPct(team.strengthPct / 100, 0), three: `${Math.max(30, team.metrics.threePct - 2)}%`, fp: `${Math.round(team.metrics.formScore / 2.1)} FP` },
    { name: `${team.short} Starter 3`, pos: 'F', height: '6-8', rating: valueFromPct(team.strengthPct / 100, -1), three: `${Math.max(29, team.metrics.threePct - 3)}%`, fp: `${Math.round(team.metrics.formScore / 2.3)} FP` },
  ];

  return React.createElement('div', { className: 'modal-backdrop', onClick: onClose },
    React.createElement('section', { className: 'team-modal', onClick: (e) => e.stopPropagation() },
      React.createElement('div', { className: 'modal-top' },
        React.createElement('div', { className: 'team-headline' },
          React.createElement('img', { src: team.logo, alt: team.name }),
          React.createElement('div', null,
            React.createElement('h3', null, `${team.name} Deep Intel`),
            React.createElement('p', { className: 'tiny' }, `Compared vs ${opponent.name}`),
          ),
        ),
        React.createElement('button', { type: 'button', className: 'deep-btn', onClick: onClose }, 'Close'),
      ),
      React.createElement('div', { className: 'compare-grid' }, rows.map((r) =>
        React.createElement('div', { key: r.key, className: 'cmp-row' },
          React.createElement('span', null, `${team.short}: ${r.a}`),
          React.createElement('strong', null, r.key),
          React.createElement('span', null, `${opponent.short}: ${r.b}`),
        ),
      )),
      React.createElement('h4', null, 'Player Status / Value Board'),
      React.createElement('div', { className: 'roster-grid' }, roster.map((p) => React.createElement('article', { key: p.name, className: 'roster-card' },
        React.createElement('strong', null, p.name),
        React.createElement('p', null, `${p.pos} · ${p.height}`),
        React.createElement('p', null, `Value: ${p.rating}`),
        React.createElement('p', null, `3PT: ${p.three}`),
        React.createElement('p', null, `Fantasy: ${p.fp}`),
      ))),
    ),
  );
}

function GameCard({ game, onOpenTeam }) {
  return React.createElement('article', { className: 'game-card reveal' },
    React.createElement('div', { className: 'card-top' },
      React.createElement('div', null,
        React.createElement('p', { className: 'status' }, game.statusText),
        React.createElement('h2', null, game.name),
        React.createElement('p', { className: 'tiny' }, `${fmtDate(game.date)} · ${game.venue} · ${game.broadcast}`),
      ),
      React.createElement('div', { className: `status-badge ${game.state}` }, statusLabel[game.state] || 'Status'),
    ),
    React.createElement('div', { className: 'teams-grid' },
      React.createElement(TeamPanel, { team: game.away, side: 'away', gameState: game.state, onOpenTeam: (t) => onOpenTeam(t, game.home) }),
      React.createElement(TeamPanel, { team: game.home, side: 'home', gameState: game.state, onOpenTeam: (t) => onOpenTeam(t, game.away) }),
    ),
    React.createElement('section', { className: 'bet-frame' },
      React.createElement('h4', null, 'Clear Prediction & Bets'),
      React.createElement('div', { className: 'bet-grid' },
        React.createElement('p', null, `${game.home.short} win: ${game.prediction.homeProb}%`),
        React.createElement('p', null, `${game.away.short} win: ${game.prediction.awayProb}%`),
        React.createElement('p', null, `Recommended pick: ${game.prediction.pick}`),
        React.createElement('p', null, `Confidence: ${game.prediction.confidence}/100`),
      ),
    ),
    React.createElement('div', { className: 'last-play' }, `Last scoring/play pulse: ${game.lastPlay}`),
    React.createElement('div', { className: 'intel-grid' },
      React.createElement('section', { className: 'intel' },
        React.createElement('h4', null, 'Market'),
        React.createElement('p', null, `Odds line: ${game.odds}`),
        React.createElement('p', null, `Over/Under: ${game.overUnder}`),
      ),
      React.createElement('section', { className: 'intel' },
        React.createElement('h4', null, 'Pro Quote'),
        game.quotes.map((q) => React.createElement('p', { key: q }, q)),
      ),
    ),
  );
}

function AccountPanel({ user, setUser }) {
  const googleRef = React.useRef(null);
  const [email, setEmail] = React.useState('');
  const [localError, setLocalError] = React.useState('');

  React.useEffect(() => {
    if (!window.google || !googleRef.current || GOOGLE_CLIENT_ID.startsWith('YOUR_')) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const payload = decodeJwt(response.credential);
        if (!payload) return;
        setUser({ name: payload.name, email: payload.email, picture: payload.picture });
      },
    });
    window.google.accounts.id.renderButton(googleRef.current, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with' });
  }, [setUser]);

  const quickLogin = () => {
    if (!/@gmail\.com$/i.test(email.trim())) {
      setLocalError('Use a valid Gmail address for quick login.');
      return;
    }
    setLocalError('');
    setUser({ name: email.split('@')[0], email: email.trim(), picture: '' });
    localStorage.setItem('nbaUser', JSON.stringify({ name: email.split('@')[0], email: email.trim() }));
  };

  return React.createElement('section', { className: 'side-card account reveal' },
    React.createElement('h3', null, 'Your Account'),
    user
      ? React.createElement('div', { className: 'user-box' },
        user.picture ? React.createElement('img', { src: user.picture, alt: user.name }) : null,
        React.createElement('div', null,
          React.createElement('strong', null, user.name),
          React.createElement('p', null, user.email),
        ),
      )
      : React.createElement('p', null, 'Login to unlock premium picks, alerts, and bet tracking.'),
    React.createElement('div', { ref: googleRef }),
    React.createElement('div', { className: 'quick-login' },
      React.createElement('input', { type: 'email', value: email, onChange: (e) => setEmail(e.target.value), placeholder: 'name@gmail.com' }),
      React.createElement('button', { type: 'button', className: 'deep-btn', onClick: quickLogin }, 'Quick Gmail Login'),
    ),
    localError ? React.createElement('p', { className: 'error' }, localError) : null,
    GOOGLE_CLIENT_ID.startsWith('YOUR_') ? React.createElement('p', { className: 'tiny' }, 'Set a real Google OAuth client ID in `GOOGLE_CLIENT_ID` to enable 1-click Google OAuth.') : null,
  );
}

function RightPanel({ trendingPlayers, trendingTeams, user, setUser }) {
  return React.createElement('aside', { className: 'right-panel' },
    React.createElement(AccountPanel, { user, setUser }),
    React.createElement('section', { className: 'side-card reveal' },
      React.createElement('h3', null, 'Trending Players'),
      trendingPlayers.length
        ? trendingPlayers.map((p, i) => React.createElement('p', { key: `${p.name}-${i}` }, `🔥 ${p.name} (${p.team}) · ${p.stat}`))
        : React.createElement('p', null, 'Waiting for live leaders feed...'),
    ),
    React.createElement('section', { className: 'side-card reveal' },
      React.createElement('h3', null, 'Trending Team Form'),
      trendingTeams.length
        ? trendingTeams.map((t, i) => React.createElement('p', { key: `${t.short}-${i}` }, `📈 ${t.short} · ${t.record} · ${t.strength}`))
        : React.createElement('p', null, 'Waiting for team form feed...'),
    ),
  );
}

function LiveTicker({ games }) {
  const items = games.map((g) => `${g.away.short} ${g.away.score} - ${g.home.score} ${g.home.short} · ${statusLabel[g.state] || g.state}`);
  return React.createElement('div', { className: 'ticker-wrap reveal' },
    React.createElement('div', { className: 'ticker-track' },
      (items.length ? [...items, ...items] : ['Live scoreboard loading...']).map((item, idx) => React.createElement('span', { key: `${item}-${idx}` }, `🏀 ${item}`)),
    ),
  );
}

function Filters({ selected, setSelected }) {
  const options = [{ key: 'all', label: 'All Games' }, { key: 'in', label: 'Live' }, { key: 'pre', label: 'Upcoming' }, { key: 'post', label: 'Final' }];
  return React.createElement('div', { className: 'filters reveal' },
    options.map((opt) => React.createElement('button', {
      key: opt.key,
      type: 'button',
      onClick: () => setSelected(opt.key),
      className: `filter-btn ${selected === opt.key ? 'active' : ''}`,
    }, opt.label)),
  );
}

function App() {
  const [games, setGames] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState('all');
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('nbaUser')) || null; } catch { return null; }
  });
  const [modalTeam, setModalTeam] = React.useState(null);
  const [modalOpponent, setModalOpponent] = React.useState(null);

  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(SCOREBOARD_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setGames((data.events || []).map(mapEvent));
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(`Live feed unavailable in this environment (${err.message}).`);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  React.useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;
    animate(nodes, { opacity: [0, 1], y: [16, 0] }, { delay: stagger(0.04), duration: 0.55, easing: 'ease-out' });
  }, [games, selectedFilter]);

  const filteredGames = games.filter((g) => selectedFilter === 'all' || g.state === selectedFilter);
  const focus = filteredGames.find((g) => g.state === 'in') || filteredGames[0] || games[0];
  const trendingPlayers = games.flatMap((g) => g.leaders).slice(0, 12);
  const trendingTeams = games.flatMap((g) => [g.home, g.away]).sort((a, b) => b.strengthPct - a.strengthPct).slice(0, 8);

  return React.createElement(React.Fragment, null,
    React.createElement(ThreeBackdrop),
    React.createElement('main', { className: 'app' },
      React.createElement('header', { className: 'hero reveal' },
        React.createElement('div', { className: 'hero-brand' },
          React.createElement('img', { src: NBA_LOGO, alt: 'NBA logo', className: 'nba-logo' }),
          React.createElement('p', { className: 'eyebrow' }, 'NBA PRIME ODDS · LIVE COMMAND CENTER'),
        ),
        React.createElement('h1', null, 'Supercharged NBA Intelligence — Live, Stylish, Functional'),
        React.createElement('p', { className: 'tiny' }, `Auto-refreshing every 60s · Last refresh ${new Date().toLocaleTimeString()}`),
        React.createElement('div', { className: 'hero-stats' },
          React.createElement('div', { className: 'hero-stat' }, React.createElement('strong', null, `${games.filter((g) => g.state === 'in').length}`), React.createElement('span', null, 'Live Games')),
          React.createElement('div', { className: 'hero-stat' }, React.createElement('strong', null, `${games.filter((g) => g.state === 'post').length}`), React.createElement('span', null, 'Final Games')),
          React.createElement('div', { className: 'hero-stat' }, React.createElement('strong', null, `${games.length}`), React.createElement('span', null, 'Total Games')),
        ),
        focus && React.createElement('div', { className: 'focus' },
          React.createElement('strong', null, 'CURRENT FOCUS GAME'),
          React.createElement('span', null, `${focus.away.short} ${focus.away.score} - ${focus.home.score} ${focus.home.short}`),
          React.createElement('span', null, `${statusLabel[focus.state] || focus.state} · ${focus.statusText}`),
          React.createElement('span', null, `Suggested bet: ${focus.prediction.pick}`),
          React.createElement('span', null, `Last scoring pulse: ${focus.lastPlay}`),
        ),
        error && React.createElement('p', { className: 'error' }, error),
      ),
      React.createElement(LiveTicker, { games: filteredGames.length ? filteredGames : games }),
      React.createElement(Filters, { selected: selectedFilter, setSelected: setSelectedFilter }),
      React.createElement('div', { className: 'layout' },
        React.createElement('section', { className: 'content' },
          loading
            ? React.createElement('p', { className: 'loading' }, 'Loading live NBA scoreboard...')
            : React.createElement('section', { className: 'cards' },
              (filteredGames.length ? filteredGames : selectedFilter !== 'all' ? [] : games).length
                ? (filteredGames.length ? filteredGames : selectedFilter !== 'all' ? [] : games).map((g) => React.createElement(GameCard, {
                  key: g.id,
                  game: g,
                  onOpenTeam: (team, opponent) => { setModalTeam(team); setModalOpponent(opponent); },
                }))
                : React.createElement('p', { className: 'loading' }, `No ${statusLabel[selectedFilter]?.toLowerCase() || 'matching'} games right now.`),
            ),
        ),
        React.createElement(RightPanel, { trendingPlayers, trendingTeams, user, setUser }),
      ),
    ),
    React.createElement(TeamIntelModal, { team: modalTeam, opponent: modalOpponent, onClose: () => setModalTeam(null) }),
  );
}

createRoot(document.getElementById('root')).render(React.createElement(App));
