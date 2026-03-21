import { StyleSheet, Text, View } from 'react-native';

import type { PortfolioPlayer } from '../types/portfolio';

type PortfolioSummaryProps = {
  players: PortfolioPlayer[];
  totalMarketValue: number;
  formationName: string;
  updatedAt: string;
};

export function PortfolioSummary({
  players,
  totalMarketValue,
  formationName,
  updatedAt,
}: PortfolioSummaryProps) {
  const weightedPnl =
    players.reduce((sum, player) => sum + player.marketValue * (player.pnlPercent / 100), 0) /
    totalMarketValue;
  const totalProfit = totalMarketValue * weightedPnl;
  const pnlColor = totalProfit >= 0 ? '#ff8f7a' : '#76d6a2';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>总市值</Text>
          <Text style={styles.primaryValue}>¥{Math.round(totalMarketValue).toLocaleString()}</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={styles.label}>阵型</Text>
          <Text style={styles.secondaryValue}>{formationName}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View>
          <Text style={styles.label}>浮动收益</Text>
          <Text style={[styles.secondaryValue, { color: pnlColor }]}>
            {totalProfit >= 0 ? '+' : '-'}¥{Math.abs(Math.round(totalProfit)).toLocaleString()}
          </Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={styles.label}>更新时间</Text>
          <Text style={styles.secondaryValue}>{updatedAt}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#d8eee1',
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    color: '#50705b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  primaryValue: {
    color: '#163928',
    fontSize: 28,
    fontWeight: '800',
  },
  secondaryValue: {
    color: '#173526',
    fontSize: 16,
    fontWeight: '700',
  },
  metricBlock: {
    alignItems: 'flex-end',
  },
});
