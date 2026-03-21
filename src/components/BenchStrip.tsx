import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PortfolioPlayer } from '../types/portfolio';

type BenchStripProps = {
  benchPlayers: PortfolioPlayer[];
  onOpenPlayer: (playerId: string) => void;
};

export function BenchStrip({ benchPlayers, onOpenPlayer }: BenchStripProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>替补席</Text>
        <Text style={styles.subtitle}>低仓位或等待出场的资产放在这里。</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {benchPlayers.map((player) => {
          return (
            <Pressable
              key={player.id}
              onPress={() => onOpenPlayer(player.id)}
              style={styles.item}
            >
              <Text style={styles.name}>{player.name}</Text>
              <Text style={styles.meta}>{player.roleLabel}</Text>
              <Text style={[styles.pnl, { color: player.pnlPercent >= 0 ? '#ff9d86' : '#79dcaa' }]}>
                {player.pnlPercent >= 0 ? '+' : ''}
                {player.pnlPercent.toFixed(1)}%
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#102330',
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#eef6f7',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#97b4c2',
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 12,
    paddingRight: 18,
  },
  item: {
    width: 148,
    backgroundColor: '#153245',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 192, 214, 0.22)',
  },
  name: {
    color: '#f8fbfb',
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: '#8bd0a7',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  pnl: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
  },
});
