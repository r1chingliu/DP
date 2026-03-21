import { StyleSheet, Text, View } from 'react-native';

type Honor = {
  title: string;
  playerId: string;
  playerName: string;
  detail: string;
};

type SeasonHonorsCardProps = {
  honors: Honor[];
};

export function SeasonHonorsCard({ honors }: SeasonHonorsCardProps) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.kicker}>Season Awards</Text>
        <Text style={styles.title}>赛季荣誉</Text>
      </View>

      <View style={styles.list}>
        {honors.map((honor, index) => (
          <View key={`${honor.playerId}-${honor.title}`} style={styles.item}>
            <View style={styles.rankPill}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{honor.title}</Text>
              <Text style={styles.playerName}>{honor.playerName}</Text>
              <Text style={styles.detail}>{honor.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#d7e5f2',
    borderRadius: 28,
    padding: 18,
    gap: 16,
  },
  kicker: {
    color: '#44627c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#122636',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  list: {
    gap: 12,
  },
  item: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  rankPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#153246',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rankText: {
    color: '#eef8fd',
    fontSize: 14,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: '#4c6b83',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerName: {
    color: '#152836',
    fontSize: 18,
    fontWeight: '800',
  },
  detail: {
    color: '#4b6475',
    fontSize: 14,
    lineHeight: 20,
  },
});
