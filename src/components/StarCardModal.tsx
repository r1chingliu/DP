import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LineupSlotAssignment, PortfolioPlayer } from '../types/portfolio';

type StarCardModalProps = {
  player: PortfolioPlayer | null;
  slot: LineupSlotAssignment | null;
  aiNote: string | null;
  onClose: () => void;
  onToggleLock: (slotId: string) => void;
};

export function StarCardModal({
  player,
  slot,
  aiNote,
  onClose,
  onToggleLock,
}: StarCardModalProps) {
  if (!player) {
    return null;
  }

  const pnlPositive = player.pnlPercent >= 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.handle} />
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.ticker}>{player.ticker}</Text>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.role}>{player.roleLabel}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{player.kind.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.heroStats}>
          <View>
            <Text style={styles.heroLabel}>持仓市值</Text>
            <Text style={styles.heroValue}>¥{player.marketValue.toLocaleString()}</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroLabel}>盈亏比例</Text>
            <Text style={[styles.heroValue, { color: pnlPositive ? '#ff8f7a' : '#6ddd9f' }]}>
              {pnlPositive ? '+' : ''}
              {player.pnlPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        <Text style={styles.summary}>{aiNote || player.aiSummary}</Text>

        <View style={styles.grid}>
          <Metric label="股数" value={player.quantity.toLocaleString()} />
          <Metric label="成本价" value={`¥${player.costPrice.toFixed(2)}`} />
          <Metric label="市价" value={`¥${player.currentPrice.toFixed(2)}`} />
          <Metric label="仓位占比" value={`${player.weightPercent.toFixed(1)}%`} />
          <Metric label="主题" value={player.themes.join(' / ')} />
        </View>

        <View style={styles.lockRow}>
          <View>
            <Text style={styles.lockTitle}>位置锁定</Text>
            <Text style={styles.lockHint}>
              {slot
                ? slot.locked
                  ? '当前已锁定，AI 重排不会改动这个位置。'
                  : '当前未锁定，允许后续 AI 重排调整。'
                : '替补席资产暂不支持位置锁定。'}
            </Text>
          </View>

          {slot ? (
            <Pressable style={styles.lockButton} onPress={() => onToggleLock(slot.slotId)}>
              <Text style={styles.lockButtonText}>{slot.locked ? '解除锁定' : '锁定位置'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>关闭</Text>
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#2a4352',
  },
  card: {
    backgroundColor: '#d8e7c9',
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticker: {
    color: '#55704f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  name: {
    color: '#17331d',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
  },
  role: {
    color: '#3c6040',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#183527',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#e8f7ef',
    fontSize: 12,
    fontWeight: '800',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroLabel: {
    color: '#55704f',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroValue: {
    color: '#16331e',
    fontSize: 24,
    fontWeight: '800',
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  summary: {
    color: '#294330',
    fontSize: 15,
    lineHeight: 23,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: 18,
    padding: 14,
  },
  metricLabel: {
    color: '#597257',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricValue: {
    color: '#183025',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  lockRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  lockTitle: {
    color: '#213c2c',
    fontSize: 16,
    fontWeight: '800',
  },
  lockHint: {
    color: '#496451',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  lockButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#163526',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lockButtonText: {
    color: '#f3faf5',
    fontWeight: '800',
  },
  closeButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeText: {
    color: '#b4c9d3',
    fontSize: 16,
    fontWeight: '700',
  },
});
