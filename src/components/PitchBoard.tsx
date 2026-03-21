import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LineupState, PitchSlot, PortfolioPlayer } from '../types/portfolio';
import type { LineupTarget } from '../lib/lineup';

type PitchBoardProps = {
  lineup: LineupState;
  slots: PitchSlot[];
  selectedTarget: LineupTarget | null;
  onOpenPlayer: (playerId: string | null) => void;
  onSelectTarget: (target: LineupTarget) => void;
  getPlayer: (playerId: string | null) => PortfolioPlayer | null;
};

export function PitchBoard({
  lineup,
  slots,
  selectedTarget,
  onOpenPlayer,
  onSelectTarget,
  getPlayer,
}: PitchBoardProps) {
  return (
    <View style={styles.shell}>
      <Text style={styles.title}>首发阵容</Text>
      <View style={styles.pitch}>
        <View style={styles.centerCircle} />
        <View style={styles.penaltyTop} />
        <View style={styles.penaltyBottom} />

        {slots.map((slot) => {
          const assignment = lineup.slots.find((item) => item.slotId === slot.id);
          const player = getPlayer(assignment?.playerId ?? null);
          const selected = selectedTarget?.kind === 'slot' && selectedTarget.id === slot.id;

          return (
            <View
              key={slot.id}
              style={[
                styles.slotWrap,
                {
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                },
              ]}
            >
              <Pressable
                onPress={() => onOpenPlayer(player?.id ?? null)}
                onLongPress={() => onSelectTarget({ kind: 'slot', id: slot.id })}
                delayLongPress={180}
                style={[
                  styles.slotButton,
                  selected && styles.slotSelected,
                  assignment?.locked && styles.lockedSlot,
                ]}
              >
                <Text style={styles.slotCode}>{slot.shortLabel}</Text>
                {player ? (
                  <>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text
                      style={[
                        styles.playerPnl,
                        { color: player.pnlPercent >= 0 ? '#ffd1c2' : '#8ef0ba' },
                      ]}
                    >
                      {player.pnlPercent >= 0 ? '+' : ''}
                      {player.pnlPercent.toFixed(1)}%
                    </Text>
                  </>
                ) : (
                  <Text style={styles.emptyLabel}>空位</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.tip}>长按球场卡片可选中位置用于换位；轻点打开球星卡。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#0c1d29',
    borderRadius: 28,
    padding: 16,
    gap: 14,
  },
  title: {
    color: '#eff8f4',
    fontSize: 18,
    fontWeight: '700',
  },
  pitch: {
    position: 'relative',
    height: 560,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#1f6e4f',
    borderWidth: 2,
    borderColor: '#98e5b8',
  },
  centerCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(235, 255, 244, 0.45)',
  },
  penaltyTop: {
    position: 'absolute',
    top: 0,
    left: '22%',
    width: '56%',
    height: 88,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(235, 255, 244, 0.45)',
  },
  penaltyBottom: {
    position: 'absolute',
    bottom: 0,
    left: '22%',
    width: '56%',
    height: 88,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(235, 255, 244, 0.45)',
  },
  slotWrap: {
    position: 'absolute',
    width: 110,
    marginLeft: -55,
    marginTop: -36,
  },
  slotButton: {
    backgroundColor: 'rgba(8, 20, 31, 0.82)',
    borderRadius: 18,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 211, 0.28)',
    alignItems: 'center',
  },
  slotSelected: {
    borderColor: '#ffe7a5',
    transform: [{ scale: 1.03 }],
  },
  lockedSlot: {
    borderColor: '#ffb26c',
  },
  slotCode: {
    color: '#97d9b0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  playerName: {
    color: '#f4faf7',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  playerPnl: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyLabel: {
    color: '#d8ece2',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  tip: {
    color: '#98b8c8',
    fontSize: 13,
    lineHeight: 19,
  },
});
