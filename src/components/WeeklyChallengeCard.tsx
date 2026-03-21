import { StyleSheet, Text, View } from 'react-native';

type WeeklyChallengeCardProps = {
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

export function WeeklyChallengeCard({
  title,
  windowLabel,
  rewardLabel,
  objective,
  progressLabel,
  progressPercent,
  opponentName,
  predictedScore,
  advice,
}: WeeklyChallengeCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Weekend League</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.rewardPill}>
          <Text style={styles.rewardText}>{rewardLabel}</Text>
        </View>
      </View>

      <Text style={styles.windowLabel}>{windowLabel}</Text>
      <Text style={styles.objective}>{objective}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
        <Text style={styles.progressPercent}>{progressPercent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.matchCard}>
        <View>
          <Text style={styles.matchLabel}>本周对手</Text>
          <Text style={styles.opponent}>{opponentName}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.matchLabel}>预测比分</Text>
          <Text style={styles.score}>{predictedScore}</Text>
        </View>
      </View>

      <Text style={styles.advice}>{advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f3dfb8',
    borderRadius: 28,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    color: '#875a11',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#35240d',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  rewardPill: {
    backgroundColor: '#33220c',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rewardText: {
    color: '#f7e6c4',
    fontSize: 12,
    fontWeight: '700',
  },
  windowLabel: {
    color: '#805d28',
    fontSize: 13,
    fontWeight: '700',
  },
  objective: {
    color: '#3b2b14',
    fontSize: 15,
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#6e5227',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  progressPercent: {
    color: '#35240d',
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(53, 36, 13, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3b2b14',
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchLabel: {
    color: '#7f5f2e',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  opponent: {
    color: '#2f210e',
    fontSize: 18,
    fontWeight: '800',
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  score: {
    color: '#2f210e',
    fontSize: 24,
    fontWeight: '900',
  },
  advice: {
    color: '#49351a',
    fontSize: 14,
    lineHeight: 21,
  },
});
