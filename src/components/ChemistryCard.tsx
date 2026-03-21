import { StyleSheet, Text, View } from 'react-native';

type ChemistryCardProps = {
  attack: number;
  control: number;
  defense: number;
  balance: number;
  total: number;
};

export function ChemistryCard({
  attack,
  control,
  defense,
  balance,
  total,
}: ChemistryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Team Chemistry</Text>
          <Text style={styles.title}>阵容默契</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalValue}>{total}</Text>
          <Text style={styles.totalLabel}>综合</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Metric label="进攻" value={attack} accent="#ff977c" />
        <Metric label="控制" value={control} accent="#8fd2ab" />
        <Metric label="防守" value={defense} accent="#99cff3" />
        <Metric label="平衡" value={balance} accent="#f2d68d" />
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#102330',
    borderRadius: 28,
    padding: 18,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    color: '#89c9a2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#edf7f3',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  totalBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#163345',
    borderWidth: 1,
    borderColor: '#23485f',
  },
  totalValue: {
    color: '#f3faf7',
    fontSize: 24,
    fontWeight: '900',
  },
  totalLabel: {
    color: '#8fb2c3',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    gap: 14,
  },
  metric: {
    gap: 8,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#dce8ed',
    fontSize: 14,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#173041',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
