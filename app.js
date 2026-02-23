import React, { useEffect, useMemo, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';

const MAP_WIDTH = 12;
const MAP_HEIGHT = 10;

const STARTERS = [
  {
    key: 'sproutle',
    name: 'Sproutle',
    type: 'Leaf',
    maxHp: 36,
    moves: [
      { name: 'Vine Tap', min: 6, max: 10 },
      { name: 'Seed Burst', min: 5, max: 12 },
    ],
  },
  {
    key: 'embercub',
    name: 'Embercub',
    type: 'Flame',
    maxHp: 34,
    moves: [
      { name: 'Cinder Paw', min: 7, max: 11 },
      { name: 'Heat Bite', min: 6, max: 13 },
    ],
  },
  {
    key: 'bubblit',
    name: 'Bubblit',
    type: 'Wave',
    maxHp: 38,
    moves: [
      { name: 'Bubble Pop', min: 5, max: 10 },
      { name: 'Tide Whip', min: 6, max: 11 },
    ],
  },
];

const WILD_POOL = [
  { name: 'Zapkit', type: 'Spark', maxHp: 24 },
  { name: 'Mossnip', type: 'Leaf', maxHp: 22 },
  { name: 'Pebblin', type: 'Stone', maxHp: 26 },
  { name: 'Mistbat', type: 'Wind', maxHp: 20 },
];

const TILE_TYPES = {
  PLAIN: 'plain',
  GRASS: 'grass',
  WATER: 'water',
  ROCK: 'rock',
};

const mapRows = [
  'RRRRRRRRRRRR',
  'RPGGGGGGGGPR',
  'RPGPPPPPGGPR',
  'RPGPWWWPGGPR',
  'RPGPWWWPPGPR',
  'RPGPPPPPPGPR',
  'RPGGGGPPPGPR',
  'RPPPPPPPPGPR',
  'RGGGGGGGGGPR',
  'RRRRRRRRRRRR',
];

const tileForChar = (char) => {
  if (char === 'G') return TILE_TYPES.GRASS;
  if (char === 'W') return TILE_TYPES.WATER;
  if (char === 'R') return TILE_TYPES.ROCK;
  return TILE_TYPES.PLAIN;
};

const createWorld = () =>
  mapRows.map((row) =>
    row.split('').map((char) => ({
      type: tileForChar(char),
      walkable: char !== 'R' && char !== 'W',
    })),
  );

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const createWildCreature = () => {
  const base = WILD_POOL[randomInt(0, WILD_POOL.length - 1)];
  return {
    ...base,
    hp: base.maxHp,
  };
};

function App() {
  const world = useMemo(() => createWorld(), []);
  const [starter, setStarter] = useState(null);
  const [playerPos, setPlayerPos] = useState({ x: 2, y: 2 });
  const [log, setLog] = useState(['Welcome, trainer! Pick a starter to begin.']);
  const [mode, setMode] = useState('intro');
  const [enemy, setEnemy] = useState(null);
  const [hp, setHp] = useState(0);

  const pushLog = (line) => {
    setLog((prev) => [...prev.slice(-3), line]);
  };

  const tryMove = (dx, dy) => {
    if (!starter || mode === 'battle') return;
    const next = { x: playerPos.x + dx, y: playerPos.y + dy };
    if (next.x < 0 || next.x >= MAP_WIDTH || next.y < 0 || next.y >= MAP_HEIGHT) return;

    const tile = world[next.y][next.x];
    if (!tile.walkable) {
      pushLog('A tough obstacle blocks the way.');
      return;
    }

    setPlayerPos(next);

    if (tile.type === TILE_TYPES.GRASS && Math.random() < 0.3) {
      const wild = createWildCreature();
      setEnemy(wild);
      setMode('battle');
      pushLog(`A wild ${wild.name} appeared!`);
    }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const map = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const next = map[event.key];
      if (!next) return;
      event.preventDefault();
      tryMove(next[0], next[1]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const chooseStarter = (pick) => {
    setStarter(pick);
    setHp(pick.maxHp);
    setMode('explore');
    setLog([`You chose ${pick.name}!`, 'Walk in tall grass to find wild monsters.']);
  };

  const attack = (move) => {
    if (!enemy || !starter) return;

    const dealt = randomInt(move.min, move.max);
    const nextEnemyHp = Math.max(0, enemy.hp - dealt);
    pushLog(`${starter.name} used ${move.name} for ${dealt} damage!`);

    if (nextEnemyHp <= 0) {
      pushLog(`${enemy.name} fainted. You won the battle!`);
      setEnemy(null);
      setMode('explore');
      return;
    }

    const rivalHit = randomInt(4, 10);
    const nextPlayerHp = Math.max(0, hp - rivalHit);
    pushLog(`${enemy.name} struck back for ${rivalHit}.`);

    setEnemy({ ...enemy, hp: nextEnemyHp });
    setHp(nextPlayerHp);

    if (nextPlayerHp <= 0) {
      setMode('gameover');
      pushLog(`${starter.name} is out of energy... Game Over.`);
    }
  };

  const restart = () => {
    setStarter(null);
    setPlayerPos({ x: 2, y: 2 });
    setHp(0);
    setEnemy(null);
    setMode('intro');
    setLog(['Welcome, trainer! Pick a starter to begin.']);
  };

  return React.createElement(
    'div',
    { className: 'page' },
    React.createElement('h1', null, 'Pocket Pixel // Game Boy Clone'),
    React.createElement(
      'div',
      { className: 'gameboy' },
      React.createElement(
        'div',
        { className: 'screen' },
        React.createElement(
          'div',
          { className: 'statusbar' },
          starter
            ? `${starter.name} HP: ${hp}/${starter.maxHp}`
            : 'No starter selected',
          mode === 'battle' && enemy ? ` | Wild ${enemy.name} HP: ${enemy.hp}/${enemy.maxHp}` : '',
        ),
        mode !== 'battle' &&
          React.createElement(
            'div',
            { className: 'map' },
            world.flatMap((row, y) =>
              row.map((tile, x) => {
                const isPlayer = playerPos.x === x && playerPos.y === y;
                return React.createElement('div', {
                  key: `${x}-${y}`,
                  className: `tile ${tile.type} ${isPlayer ? 'player' : ''}`,
                });
              }),
            ),
          ),
        mode === 'battle' &&
          enemy &&
          React.createElement(
            'div',
            { className: 'battle' },
            React.createElement('p', null, `Wild ${enemy.name} (${enemy.type})`),
            React.createElement('p', null, 'Choose a move:'),
            React.createElement(
              'div',
              { className: 'moves' },
              starter.moves.map((move) =>
                React.createElement(
                  'button',
                  { key: move.name, onClick: () => attack(move) },
                  move.name,
                ),
              ),
            ),
          ),
        mode === 'intro' &&
          React.createElement(
            'div',
            { className: 'overlay' },
            React.createElement('p', null, 'Choose your starter'),
            React.createElement(
              'div',
              { className: 'starter-list' },
              STARTERS.map((pick) =>
                React.createElement(
                  'button',
                  { key: pick.key, onClick: () => chooseStarter(pick) },
                  `${pick.name} (${pick.type})`,
                ),
              ),
            ),
          ),
        mode === 'gameover' &&
          React.createElement(
            'div',
            { className: 'overlay' },
            React.createElement('p', null, 'You blacked out!'),
            React.createElement('button', { onClick: restart }, 'Restart Adventure'),
          ),
      ),
      React.createElement(
        'div',
        { className: 'controls' },
        React.createElement(
          'div',
          { className: 'dpad' },
          React.createElement('button', { onClick: () => tryMove(0, -1) }, '↑'),
          React.createElement('button', { onClick: () => tryMove(-1, 0) }, '←'),
          React.createElement('button', { onClick: () => tryMove(1, 0) }, '→'),
          React.createElement('button', { onClick: () => tryMove(0, 1) }, '↓'),
        ),
        React.createElement(
          'div',
          { className: 'notes' },
          React.createElement('p', null, 'Move with arrow keys or D-pad'),
          React.createElement('p', null, 'Fight in turn-based mini-battles'),
          React.createElement('button', { onClick: restart }, 'Reset'),
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'log' },
      log.map((entry, index) => React.createElement('p', { key: `${entry}-${index}` }, `> ${entry}`)),
    ),
  );
}

createRoot(document.getElementById('root')).render(React.createElement(App));
