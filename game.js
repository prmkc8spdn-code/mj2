/**
 * 名将传 - 单机卡牌对战
 * 玩家 vs 草莽（AI）
 */

const STAT_NAMES = { strategy: '策略', command: '统帅', martial: '武力', influence: '威望' };
const STAT_KEYS = ['strategy', 'command', 'martial', 'influence'];

const GENERALS = [
  { name: '项羽', strategy: 6, command: 9, martial: 10, influence: 10 },
  { name: '韩信', strategy: 10, command: 10, martial: 5, influence: 9 },
  { name: '卫青', strategy: 8, command: 9, martial: 7, influence: 9 },
  { name: '霍去病', strategy: 7, command: 9, martial: 9, influence: 9 },
  { name: '关羽', strategy: 6, command: 7, martial: 10, influence: 10 },
  { name: '李靖', strategy: 9, command: 10, martial: 7, influence: 8 },
  { name: '岳飞', strategy: 8, command: 9, martial: 10, influence: 10 },
  { name: '白起', strategy: 9, command: 10, martial: 7, influence: 9 },
  { name: '吕布', strategy: 3, command: 6, martial: 10, influence: 7 },
  { name: '赵云', strategy: 7, command: 8, martial: 10, influence: 8 },
];

const state = {
  phase: 'coin',
  playerFirst: null,
  deck: [],           // 本局 8 张牌（general 对象 + revealed）
  playerHand: [],
  npcHand: [],
  battleRound: 0,
  playerScore: 0,
  npcScore: 0,
  attacker: null,     // 'player' | 'npc'
  playerSelectedCard: null,
  npcSelectedCard: null,
  chosenAttr: null,
  roundWinner: null,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDice() {
  return Math.floor(Math.random() * 4);
}

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(el => el.classList.add('hidden'));
  const phase = document.getElementById(id);
  if (phase) phase.classList.remove('hidden');
}

function getStat(general, attr) {
  return general[attr] ?? 0;
}

// ---------- 硬币 ----------
function runCoinFlip() {
  const coin = document.getElementById('coin');
  const resultEl = document.getElementById('coin-result');
  const btn = document.getElementById('btn-after-coin');
  resultEl.classList.add('hidden');
  btn.classList.add('hidden');
  coin.classList.remove('flip');

  void coin.offsetWidth;
  const isHeads = Math.random() < 0.5;
  state.playerFirst = isHeads;
  state.attacker = isHeads ? 'player' : 'npc';

  coin.classList.remove('result-heads', 'result-tails');
  coin.classList.add('flip');
  setTimeout(() => {
    coin.classList.remove('flip');
    coin.classList.add(isHeads ? 'result-heads' : 'result-tails');
    resultEl.textContent = isHeads ? '你是攻方' : '你是守方';
    resultEl.classList.remove('hidden');
    btn.classList.remove('hidden');
  }, 1200);
}

// ---------- 选将 ----------
function buildDeck() {
  const indices = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 8);
  const revealedIndices = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 4);
  state.deck = indices.map((i, idx) => ({
    ...GENERALS[i],
    revealed: revealedIndices.includes(idx),
    taken: false,
  }));
}

function renderDeck() {
  const container = document.getElementById('deck');
  container.innerHTML = '';
  state.deck.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card' + (!card.revealed ? ' covered' : '') + (card.taken ? ' taken' : '');
    if (!card.taken && !card.covered) el.dataset.index = idx;
    el.innerHTML = `
      <span class="card-name">${card.revealed ? card.name : '?'}</span>
      <div class="card-stats">
        ${card.revealed ? STAT_KEYS.map(k => `
          <div class="stat-row">
            <span class="stat-label">${STAT_NAMES[k]}</span>
            <span class="stat-value">${getStat(card, k)}</span>
            <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
          </div>
        `).join('') : ''}
      </div>
    `;
    if (!card.taken) {
      el.addEventListener('click', () => onDeckCardClick(idx));
    }
    container.appendChild(el);
  });
}

function getPickOrder() {
  const first = state.playerFirst ? 'player' : 'npc';
  const second = state.playerFirst ? 'npc' : 'player';
  return [
    { who: first, count: 1 },
    { who: second, count: 2 },
    { who: first, count: 2 },
    { who: second, count: 2 },
    { who: first, count: 1 },
  ];
}

let pickStep = 0;
let pickCount = 0;

function startPickPhase() {
  buildDeck();
  state.playerHand = [];
  state.npcHand = [];
  pickStep = 0;
  pickCount = 0;
  runPickTurn();
  renderDeck();
  renderHands();
  document.getElementById('btn-after-pick').classList.add('hidden');
  showPhase('phase-pick');
}

function runPickTurn() {
  const order = getPickOrder();
  const step = order[pickStep];
  const need = step.count;
  const isPlayer = step.who === 'player';

  document.getElementById('pick-prompt').textContent = isPlayer
    ? `请选择 ${need} 张武将`
    : `草莽正在选将……`;
  document.getElementById('pick-turn').textContent = isPlayer ? '轮到你选牌' : '草莽选牌中';

  if (!isPlayer) {
    pickCount = need;
    npcPickFromDeck(need);
    return;
  }
  pickCount = need;
}

function onDeckCardClick(idx) {
  if (pickCount <= 0) return;
  const card = state.deck[idx];
  if (!card || card.taken) return;

  card.taken = true;
  state.playerHand.push({ ...card });
  pickCount--;
  renderDeck();
  renderHands();

  if (pickCount > 0) return;

  pickStep++;
  if (pickStep >= getPickOrder().length) {
    document.getElementById('pick-prompt').textContent = '选将结束，准备战斗';
    document.getElementById('pick-turn').textContent = '';
    document.getElementById('btn-after-pick').classList.remove('hidden');
    return;
  }
  setTimeout(runPickTurn, 400);
}

function npcPickFromDeck(need) {
  const pool = state.deck
    .map((c, i) => ({ card: c, index: i }))
    .filter(({ card }) => !card.taken);

  const revealed = pool.filter(({ card }) => card.revealed);
  const covered = pool.filter(({ card }) => !card.revealed);
  const bothExist = revealed.length > 0 && covered.length > 0;

  const toPick = [];
  if (bothExist) {
    for (let i = 0; i < need && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      toPick.push(pool.splice(idx, 1)[0]);
    }
  } else if (revealed.length > 0) {
    revealed.sort((a, b) => {
      const sumA = STAT_KEYS.reduce((s, k) => s + getStat(a.card, k), 0);
      const sumB = STAT_KEYS.reduce((s, k) => s + getStat(b.card, k), 0);
      return sumB - sumA;
    });
    for (let i = 0; i < need && revealed.length > 0; i++) toPick.push(revealed.shift());
  } else {
    for (let i = 0; i < need && covered.length > 0; i++) {
      const idx = Math.floor(Math.random() * covered.length);
      toPick.push(covered.splice(idx, 1)[0]);
    }
  }

  for (const { card, index } of toPick) {
    state.deck[index].taken = true;
    state.npcHand.push({ ...card });
  }

  renderDeck();
  renderHands();
  pickStep++;
  if (pickStep >= getPickOrder().length) {
    document.getElementById('pick-prompt').textContent = '选将结束，准备战斗';
    document.getElementById('pick-turn').textContent = '';
    document.getElementById('btn-after-pick').classList.remove('hidden');
    return;
  }
  setTimeout(runPickTurn, 600);
}

function renderHands() {
  const playerContainer = document.getElementById('hand-player');
  playerContainer.innerHTML = '';
  state.playerHand.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.index = idx;
    el.innerHTML = `
      <span class="card-name">${card.name}</span>
      <div class="card-stats">
        ${STAT_KEYS.map(k => `
          <div class="stat-row">
            <span class="stat-label">${STAT_NAMES[k]}</span>
            <span class="stat-value">${getStat(card, k)}</span>
            <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
          </div>
        `).join('')}
      </div>
    `;
    playerContainer.appendChild(el);
  });

  const npcContainer = document.getElementById('hand-npc');
  npcContainer.innerHTML = '';
  state.npcHand.forEach(() => {
    const el = document.createElement('div');
    el.className = 'card covered';
    el.innerHTML = '<span class="card-name">?</span><div class="card-stats"></div>';
    npcContainer.appendChild(el);
  });
}

// ---------- 战斗 ----------
function startBattle() {
  state.battleRound = 0;
  state.playerScore = 0;
  state.npcScore = 0;
  state.attacker = state.playerFirst ? 'player' : 'npc';
  updateBattleScore();
  showPhase('phase-battle');
  document.getElementById('battle-cards').classList.add('hidden');
  document.getElementById('battle-choose-attr').classList.add('hidden');
  document.getElementById('attr-buttons').classList.add('hidden');
  document.getElementById('battle-round-result').classList.add('hidden');
  document.getElementById('btn-next-round').classList.add('hidden');
  startBattleRound();
}

function updateBattleScore() {
  document.getElementById('score-player').textContent = state.playerScore;
  document.getElementById('score-npc').textContent = state.npcScore;
}

function getPlayablePlayerCards() {
  return state.playerHand.filter((c, i) => !state.usedPlayerIndices.includes(i));
}

function startBattleRound() {
  state.battleRound++;
  state.usedPlayerIndices = state.usedPlayerIndices || [];
  state.usedNpcIndices = state.usedNpcIndices || [];
  state.playerSelectedCard = null;
  state.npcSelectedCard = null;
  state.chosenAttr = null;

  const roundHint = document.getElementById('battle-round-hint');
  const isPlayerAttacker = state.attacker === 'player';
  roundHint.textContent = `第 ${state.battleRound} 回合 - 你是${isPlayerAttacker ? '攻方' : '守方'} - 请选择本回合出战的武将`;
  roundHint.classList.remove('hidden');

  const playable = getPlayablePlayerCards();
  const handContainer = document.getElementById('battle-hand-cards');
  handContainer.innerHTML = '';
  state.playerHand.forEach((card, idx) => {
    const used = state.usedPlayerIndices.includes(idx);
    const el = document.createElement('div');
    el.className = 'card' + (used ? ' taken' : '');
    el.dataset.index = idx;
    if (!used) {
      el.innerHTML = `
        <span class="card-name">${card.name}</span>
        <div class="card-stats">
          ${STAT_KEYS.map(k => `
            <div class="stat-row">
              <span class="stat-label">${STAT_NAMES[k]}</span>
              <span class="stat-value">${getStat(card, k)}</span>
              <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
            </div>
          `).join('')}
        </div>
      `;
      el.addEventListener('click', () => onPlayerSelectBattleCard(idx));
    } else {
      el.innerHTML = '<span class="card-name">已出</span>';
    }
    handContainer.appendChild(el);
  });

  document.getElementById('battle-cards').classList.add('hidden');
  document.getElementById('battle-choose-attr').classList.add('hidden');
  document.getElementById('attr-buttons').classList.add('hidden');
  document.getElementById('battle-round-result').classList.add('hidden');
  document.getElementById('btn-roll-dice').classList.add('hidden');
  document.getElementById('btn-next-round').classList.add('hidden');
}

function onPlayerSelectBattleCard(idx) {
  if (state.playerSelectedCard !== null) return;
  if (state.usedPlayerIndices.includes(idx)) return;

  state.playerSelectedCard = { index: idx, card: state.playerHand[idx] };
  const npcIdx = npcChooseBattleCard();
  state.npcSelectedCard = { index: npcIdx, card: state.npcHand[npcIdx] };

  document.getElementById('battle-round-hint').classList.add('hidden');
  document.getElementById('battle-hand-cards').querySelectorAll('.card').forEach((el, i) => {
    el.style.pointerEvents = 'none';
    if (i === idx) el.style.borderColor = 'var(--gold)';
  });

  if (state.attacker === 'player') {
    document.getElementById('battle-choose-attr').textContent = '请选择本回合比较的属性';
    document.getElementById('battle-choose-attr').classList.remove('hidden');
    document.getElementById('attr-buttons').classList.remove('hidden');
    document.querySelectorAll('.attr-btn').forEach(btn => {
      btn.disabled = false;
      btn.onclick = () => onPlayerChooseAttr(btn.dataset.attr);
    });
  } else {
    const attr = npcChooseAttr(state.npcSelectedCard.card);
    state.chosenAttr = attr;
    setTimeout(() => revealAndRoll(attr), 500);
  }
}

function npcChooseBattleCard() {
  const used = state.usedNpcIndices || [];
  let bestIdx = -1;
  let bestMax = -1;
  state.npcHand.forEach((card, idx) => {
    if (used.includes(idx)) return;
    const maxStat = Math.max(...STAT_KEYS.map(k => getStat(card, k)));
    if (maxStat > bestMax) {
      bestMax = maxStat;
      bestIdx = idx;
    }
  });
  if (bestIdx === -1) {
    const available = state.npcHand.map((_, i) => i).filter(i => !used.includes(i));
    bestIdx = available[Math.floor(Math.random() * available.length)];
  }
  return bestIdx;
}

function npcChooseAttr(npcCard) {
  let bestAttr = STAT_KEYS[0];
  let bestVal = getStat(npcCard, bestAttr);
  STAT_KEYS.forEach(k => {
    const v = getStat(npcCard, k);
    if (v > bestVal) {
      bestVal = v;
      bestAttr = k;
    }
  });
  return bestAttr;
}

function onPlayerChooseAttr(attr) {
  state.chosenAttr = attr;
  document.getElementById('battle-choose-attr').classList.add('hidden');
  document.getElementById('attr-buttons').classList.add('hidden');
  document.querySelectorAll('.attr-btn').forEach(btn => { btn.onclick = null; });
  revealAndRoll(attr);
}

function revealAndRoll(attr) {
  const slotPlayer = document.getElementById('battle-card-player');
  const slotNpc = document.getElementById('battle-card-npc');
  const dicePlayer = document.getElementById('battle-dice-player');
  const diceNpc = document.getElementById('battle-dice-npc');

  const pCard = state.playerSelectedCard.card;
  const nCard = state.npcSelectedCard.card;

  const statRow = (k, card, highlight) => `
    <div class="stat-row${highlight ? ' stat-highlight' : ''}">
      <span class="stat-label">${STAT_NAMES[k]}</span>
      <span class="stat-value">${getStat(card, k)}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
    </div>
  `;
  slotPlayer.innerHTML = `
    <span class="card-name">${pCard.name}</span>
    <div class="card-stats">
      ${STAT_KEYS.map(k => statRow(k, pCard, k === attr)).join('')}
    </div>
  `;
  slotNpc.innerHTML = `
    <span class="card-name">${nCard.name}</span>
    <div class="card-stats">
      ${STAT_KEYS.map(k => statRow(k, nCard, k === attr)).join('')}
    </div>
  `;

  document.getElementById('battle-cards').classList.remove('hidden');
  dicePlayer.textContent = '';
  diceNpc.textContent = '';
  document.getElementById('battle-round-result').classList.add('hidden');
  document.getElementById('btn-roll-dice').classList.remove('hidden');
  document.getElementById('btn-roll-dice').onclick = () => doRollAndCompare(attr, pCard, nCard);
}

function doRollAndCompare(attr, pCard, nCard) {
  const dicePlayer = document.getElementById('battle-dice-player');
  const diceNpc = document.getElementById('battle-dice-npc');
  document.getElementById('btn-roll-dice').classList.add('hidden');
  document.getElementById('btn-roll-dice').onclick = null;

  const d1 = rollDice();
  const d2 = rollDice();
  const pTotal = getStat(pCard, attr) + d1;
  const nTotal = getStat(nCard, attr) + d2;

  dicePlayer.textContent = `${STAT_NAMES[attr]} ${getStat(pCard, attr)} + 骰 ${d1} = ${pTotal}`;
  diceNpc.textContent = `${STAT_NAMES[attr]} ${getStat(nCard, attr)} + 骰 ${d2} = ${nTotal}`;

  const resultEl = document.getElementById('battle-round-result');
  resultEl.classList.remove('win', 'lose');

  if (pTotal > nTotal) {
    const vp = pTotal - nTotal;
    state.playerScore += vp;
    state.roundWinner = 'player';
    resultEl.textContent = `本回合你胜！获得 ${vp} 点胜利分`;
    resultEl.classList.add('win');
  } else if (nTotal > pTotal) {
    const vp = nTotal - pTotal;
    state.npcScore += vp;
    state.roundWinner = 'npc';
    resultEl.textContent = `本回合草莽胜！草莽获得 ${vp} 点胜利分`;
    resultEl.classList.add('lose');
  } else {
    state.roundWinner = null;
    resultEl.textContent = '本回合平局，不记分';
  }
  resultEl.classList.remove('hidden');

  state.usedPlayerIndices.push(state.playerSelectedCard.index);
  state.usedNpcIndices.push(state.npcSelectedCard.index);

  if (state.roundWinner === 'player') state.attacker = 'npc';
  else if (state.roundWinner === 'npc') state.attacker = 'player';

  updateBattleScore();

  if (state.battleRound < 3) {
    document.getElementById('btn-next-round').classList.remove('hidden');
  } else {
    setTimeout(showEndPhase, 1500);
  }
}

function showEndPhase() {
  showPhase('phase-end');
  const resultEl = document.getElementById('end-result');
  const msgEl = document.getElementById('end-message');
  const lbSection = document.getElementById('end-leaderboard');
  const lbList = document.getElementById('leaderboard-list');

  resultEl.textContent = `最终比分为 玩家 ${state.playerScore} : 草莽 ${state.npcScore}`;

  if (state.playerScore === state.npcScore) {
    msgEl.textContent = '旗鼓相当';
    lbSection.classList.add('hidden');
  } else if (state.playerScore < state.npcScore) {
    msgEl.textContent = '胜败乃兵家常事';
    lbSection.classList.add('hidden');
  } else {
    const diff = state.playerScore - state.npcScore;
    let tier = '';
    if (diff > 5) tier = '用兵如神';
    else if (diff >= 3) tier = '神机妙算';
    else tier = '运筹帷幄';
    msgEl.innerHTML = `恭喜主公，获得胜利！<br>${tier}`;
    lbSection.classList.remove('hidden');
  }

  lbList.innerHTML = '';
  const leaderboard = JSON.parse(localStorage.getItem('mingjiang_leaderboard') || '[]');
  if (leaderboard.length > 0 && state.playerScore > state.npcScore) {
    const h3 = document.createElement('h3');
    h3.textContent = '排行榜';
    lbList.appendChild(h3);
    leaderboard.slice(0, 5).forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-item';
      row.innerHTML = `<span>${i + 1}. ${entry.name}</span><span>${entry.score} 分</span>`;
      lbList.appendChild(row);
    });
  }
}

function submitScore() {
  const input = document.getElementById('username');
  const name = (input.value || '佚名').trim().slice(0, 20);
  const score = state.playerScore;
  let leaderboard = JSON.parse(localStorage.getItem('mingjiang_leaderboard') || '[]');
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 50);
  localStorage.setItem('mingjiang_leaderboard', JSON.stringify(leaderboard));

  const lbList = document.getElementById('leaderboard-list');
  lbList.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = '排行榜';
  lbList.appendChild(h3);
  leaderboard.slice(0, 5).forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-item';
    row.innerHTML = `<span>${i + 1}. ${entry.name}</span><span>${entry.score} 分</span>`;
    lbList.appendChild(row);
  });
  input.value = '';
}

function playAgain() {
  state.phase = 'coin';
  state.playerFirst = null;
  state.deck = [];
  state.playerHand = [];
  state.npcHand = [];
  state.usedPlayerIndices = [];
  state.usedNpcIndices = [];
  const coin = document.getElementById('coin');
  coin.classList.remove('flip', 'result-heads', 'result-tails');
  runCoinFlip();
  showPhase('phase-coin');
}

function nextRound() {
  document.getElementById('btn-next-round').classList.add('hidden');
  startBattleRound();
}

// ---------- 初始化 ----------
document.getElementById('btn-after-coin').addEventListener('click', () => {
  startPickPhase();
});

document.getElementById('btn-after-pick').addEventListener('click', () => {
  startBattle();
});

document.getElementById('btn-next-round').addEventListener('click', nextRound);

document.getElementById('btn-submit-score').addEventListener('click', submitScore);

document.getElementById('btn-play-again').addEventListener('click', playAgain);

document.getElementById('username').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitScore();
});

document.getElementById('btn-rules').addEventListener('click', () => {
  document.getElementById('rules-panel').classList.toggle('hidden');
});
document.getElementById('btn-close-rules').addEventListener('click', () => {
  document.getElementById('rules-panel').classList.add('hidden');
});

runCoinFlip();
showPhase('phase-coin');
