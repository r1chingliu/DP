import type {
  LineupSlotAssignment,
  LineupState,
  PitchSlot,
  PortfolioPlayer,
  SlotGroup,
} from '../types/portfolio';

export type LineupTarget =
  | { kind: 'slot'; id: string }
  | { kind: 'bench'; id: string };

const pitchSlots: PitchSlot[] = [
  { id: 'gk', label: 'Goalkeeper', shortLabel: 'GK', group: 'keeper', x: 50, y: 88 },
  { id: 'lb', label: 'Left Back', shortLabel: 'LB', group: 'defense', x: 18, y: 68 },
  { id: 'lcb', label: 'Left Center Back', shortLabel: 'LCB', group: 'defense', x: 38, y: 71 },
  { id: 'rcb', label: 'Right Center Back', shortLabel: 'RCB', group: 'defense', x: 62, y: 71 },
  { id: 'rb', label: 'Right Back', shortLabel: 'RB', group: 'defense', x: 82, y: 68 },
  { id: 'cm-left', label: 'Left Midfield', shortLabel: 'LCM', group: 'midfield', x: 26, y: 48 },
  { id: 'cm-center', label: 'Center Midfield', shortLabel: 'CM', group: 'midfield', x: 50, y: 42 },
  { id: 'cm-right', label: 'Right Midfield', shortLabel: 'RCM', group: 'midfield', x: 74, y: 48 },
  { id: 'lw', label: 'Left Wing', shortLabel: 'LW', group: 'attack', x: 22, y: 22 },
  { id: 'st', label: 'Striker', shortLabel: 'ST', group: 'attack', x: 50, y: 16 },
  { id: 'rw', label: 'Right Wing', shortLabel: 'RW', group: 'attack', x: 78, y: 22 },
];

const slotGroupPreferences: Record<string, SlotGroup[]> = {
  keeper: ['keeper', 'defense'],
  anchor: ['midfield', 'defense'],
  shield: ['defense', 'midfield'],
  engine: ['midfield', 'attack'],
  wing: ['attack', 'midfield'],
  striker: ['attack', 'midfield'],
};

export function getPitchSlots() {
  return pitchSlots;
}

export function buildRecommendedLineup(players: PortfolioPlayer[]): LineupState {
  const orderedPlayers = [...players].sort((a, b) => b.weightPercent - a.weightPercent);
  const remainingSlots = [...pitchSlots];
  const assignments: LineupSlotAssignment[] = [];

  for (const player of orderedPlayers) {
    const preferredGroups = slotGroupPreferences[player.roleProfile];
    const slot =
      remainingSlots.find((item) => preferredGroups.includes(item.group)) ?? remainingSlots[0];

    if (!slot) {
      continue;
    }

    assignments.push({
      slotId: slot.id,
      playerId: player.id,
      locked: false,
    });

    const index = remainingSlots.findIndex((item) => item.id === slot.id);
    remainingSlots.splice(index, 1);
  }

  for (const slot of remainingSlots) {
    assignments.push({
      slotId: slot.id,
      playerId: null,
      locked: false,
    });
  }

  return {
    formationName: '4-3-3',
    slots: assignments.sort(
      (left, right) =>
        pitchSlots.findIndex((slot) => slot.id === left.slotId) -
        pitchSlots.findIndex((slot) => slot.id === right.slotId),
    ),
  };
}

export function createInitialAssignments(lineup: LineupState): LineupState {
  return {
    formationName: lineup.formationName,
    slots: lineup.slots.map((slot) => ({ ...slot })),
  };
}

export function getBenchPlayers(players: PortfolioPlayer[], lineup: LineupState) {
  const slottedIds = new Set(lineup.slots.flatMap((slot) => (slot.playerId ? [slot.playerId] : [])));
  return players.filter((player) => !slottedIds.has(player.id));
}

export function getLineupPlayer(players: PortfolioPlayer[], playerId: string | null) {
  if (!playerId) {
    return null;
  }
  return players.find((player) => player.id === playerId) ?? null;
}

export function toggleSlotLock(lineup: LineupState, slotId: string): LineupState {
  return {
    ...lineup,
    slots: lineup.slots.map((slot) =>
      slot.slotId === slotId ? { ...slot, locked: !slot.locked } : slot,
    ),
  };
}

export function movePlayerBetweenTargets(
  lineup: LineupState,
  source: LineupTarget,
  target: LineupTarget,
): LineupState {
  if (source.kind === 'bench' && target.kind === 'bench') {
    return lineup;
  }

  const nextSlots = lineup.slots.map((slot) => ({ ...slot }));
  const sourceSlotIndex = source.kind === 'slot' ? nextSlots.findIndex((slot) => slot.slotId === source.id) : -1;
  const targetSlotIndex = target.kind === 'slot' ? nextSlots.findIndex((slot) => slot.slotId === target.id) : -1;

  const sourcePlayerId =
    source.kind === 'slot'
      ? sourceSlotIndex >= 0
        ? nextSlots[sourceSlotIndex].playerId
        : null
      : source.id;

  const targetPlayerId =
    target.kind === 'slot'
      ? targetSlotIndex >= 0
        ? nextSlots[targetSlotIndex].playerId
        : null
      : target.id;

  if (source.kind === 'slot' && sourceSlotIndex >= 0 && nextSlots[sourceSlotIndex].locked) {
    return lineup;
  }

  if (target.kind === 'slot' && targetSlotIndex >= 0 && nextSlots[targetSlotIndex].locked) {
    return lineup;
  }

  if (source.kind === 'slot' && sourceSlotIndex >= 0) {
    nextSlots[sourceSlotIndex].playerId =
      target.kind === 'slot' ? targetPlayerId : targetPlayerId;
  }

  if (target.kind === 'slot' && targetSlotIndex >= 0) {
    nextSlots[targetSlotIndex].playerId = sourcePlayerId;
  }

  return {
    ...lineup,
    slots: nextSlots,
  };
}

export function buildSwapCandidateLabel(
  target: LineupTarget,
  lineup: LineupState,
  players: PortfolioPlayer[],
) {
  if (target.kind === 'bench') {
    const player = players.find((item) => item.id === target.id);
    return player ? `已选中替补 ${player.name}，再点一个球场位置即可换入首发。` : '已选中替补。';
  }

  const slot = lineup.slots.find((item) => item.slotId === target.id);
  const slotMeta = pitchSlots.find((item) => item.id === target.id);
  const player = players.find((item) => item.id === slot?.playerId);
  const lockHint = slot?.locked ? '该位置已锁定，不能参与调位。' : '再点一个位置或替补席即可完成换位。';

  if (!player) {
    return `${slotMeta?.shortLabel ?? '空位'} 当前为空。${lockHint}`;
  }

  return `已选中 ${player.name} (${slotMeta?.shortLabel ?? '位置'})。${lockHint}`;
}
