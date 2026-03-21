import type { LineupState, PortfolioPlayer } from '../types/portfolio';

type ChemistryBreakdown = {
  attack: number;
  control: number;
  defense: number;
  balance: number;
  total: number;
};

type WeeklyChallenge = {
  title: string;
  windowLabel: string;
  rewardLabel: string;
  objective: string;
  progressLabel: string;
  progressPercent: number;
  opponentName: string;
  predictedScore: string;
  advice: string;
};

type SeasonHonor = {
  title: string;
  playerId: string;
  playerName: string;
  detail: string;
};

export function getStarterPlayers(players: PortfolioPlayer[], lineup: LineupState) {
  return lineup.slots
    .map((slot) => players.find((player) => player.id === slot.playerId) ?? null)
    .filter((player): player is PortfolioPlayer => Boolean(player));
}

export function buildChemistryBreakdown(
  players: PortfolioPlayer[],
  lineup: LineupState,
): ChemistryBreakdown {
  const starters = getStarterPlayers(players, lineup);
  const totalWeight = starters.reduce((sum, player) => sum + player.weightPercent, 0) || 1;

  let attack = 42;
  let control = 42;
  let defense = 42;

  for (const player of starters) {
    const weightFactor = player.weightPercent / totalWeight;
    const stability = Math.max(0, 14 - Math.abs(player.pnlPercent));
    const momentum = Math.min(18, Math.max(-8, player.pnlPercent));

    if (player.roleProfile === 'striker' || player.roleProfile === 'wing') {
      attack += 18 * weightFactor + momentum * 0.45;
      control += 6 * weightFactor;
    }

    if (player.roleProfile === 'engine' || player.roleProfile === 'anchor') {
      control += 20 * weightFactor + stability * 0.25;
      defense += 8 * weightFactor;
    }

    if (player.roleProfile === 'shield' || player.roleProfile === 'keeper') {
      defense += 22 * weightFactor + stability * 0.35;
      control += 5 * weightFactor;
    }

    if (player.kind === 'etf') {
      control += 4 * weightFactor;
      defense += 3 * weightFactor;
    } else {
      attack += 3 * weightFactor;
    }
  }

  const themeCounts = countThemes(starters);
  const diversityBonus = Math.min(10, Object.keys(themeCounts).length);
  const concentrationPenalty = Math.max(0, Math.max(...Object.values(themeCounts), 0) - 3) * 3;
  const attackRounded = clampScore(Math.round(attack));
  const controlRounded = clampScore(Math.round(control + diversityBonus));
  const defenseRounded = clampScore(Math.round(defense - concentrationPenalty));
  const balance = clampScore(
    Math.round(100 - (Math.abs(attackRounded - controlRounded) + Math.abs(controlRounded - defenseRounded)) / 2),
  );

  return {
    attack: attackRounded,
    control: controlRounded,
    defense: defenseRounded,
    balance,
    total: Math.round((attackRounded + controlRounded + defenseRounded + balance) / 4),
  };
}

export function buildWeeklyChallenge(
  players: PortfolioPlayer[],
  lineup: LineupState,
): WeeklyChallenge {
  const starters = getStarterPlayers(players, lineup);
  const etfStarters = starters.filter((player) => player.kind === 'etf').length;
  const positivePlayers = starters.filter((player) => player.pnlPercent >= 0).length;
  const chemistry = buildChemistryBreakdown(players, lineup);
  const progressPercent = clampScore(Math.round((etfStarters / 3) * 100));
  const projectedGoals = Math.max(1, Math.round((chemistry.attack + chemistry.control) / 75));
  const projectedConceded = chemistry.defense >= 68 ? 0 : chemistry.defense >= 58 ? 1 : 2;

  return {
    title: '本周阵容挑战',
    windowLabel: '第 12 轮 · 周一锁阵 / 周日结算',
    rewardLabel: '奖励: 稳健中场徽章',
    objective: '首发至少放入 3 个 ETF，并保持 7 名以上球员收益为正。',
    progressLabel: `${etfStarters}/3 ETF 首发，${positivePlayers}/11 状态在线`,
    progressPercent: Math.min(100, Math.round((progressPercent + (positivePlayers / 11) * 100) / 2)),
    opponentName: chemistry.balance >= 70 ? '低波联队' : '成长突击队',
    predictedScore: `${projectedGoals} : ${projectedConceded}`,
    advice:
      chemistry.balance >= 70
        ? '当前阵容结构比较均衡，优先保住中后场稳定性。'
        : '锋线火力够，但中场衔接偏飘，补一个稳健 ETF 会更像完整周赛阵容。',
  };
}

export function buildSeasonHonors(
  players: PortfolioPlayer[],
  lineup: LineupState,
): SeasonHonor[] {
  const starters = getStarterPlayers(players, lineup);
  const candidatePool = starters.length ? starters : players;
  const mvp =
    [...candidatePool].sort(
      (left, right) =>
        right.pnlPercent * right.weightPercent - left.pnlPercent * left.weightPercent,
    )[0] ?? players[0];
  const anchor =
    [...candidatePool]
      .filter((player) => player.roleProfile === 'keeper' || player.roleProfile === 'shield' || player.roleProfile === 'anchor')
      .sort((left, right) => Math.abs(left.pnlPercent) - Math.abs(right.pnlPercent))[0] ?? candidatePool[0];
  const spark =
    [...candidatePool]
      .filter((player) => player.roleProfile === 'wing' || player.roleProfile === 'striker')
      .sort((left, right) => right.pnlPercent - left.pnlPercent)[0] ?? candidatePool[0];

  return [
    {
      title: '赛季 MVP',
      playerId: mvp.id,
      playerName: mvp.name,
      detail: `收益弹性和仓位权重都够，当前是这套阵容最像核心王牌的球员。`,
    },
    {
      title: '后场队魂',
      playerId: anchor.id,
      playerName: anchor.name,
      detail: `波动控制最好，适合当你这套组合里的稳定器。`,
    },
    {
      title: '爆点先生',
      playerId: spark.id,
      playerName: spark.name,
      detail: `更适合放在前场承担突破和爆发，是本周最有戏的进攻点。`,
    },
  ];
}

function countThemes(players: PortfolioPlayer[]) {
  return players.reduce<Record<string, number>>((acc, player) => {
    for (const theme of player.themes) {
      acc[theme] = (acc[theme] ?? 0) + 1;
    }
    return acc;
  }, {});
}

function clampScore(value: number) {
  return Math.max(0, Math.min(99, value));
}
