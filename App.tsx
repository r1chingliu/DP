import { StatusBar } from 'expo-status-bar';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMemo, useState } from 'react';

import { BenchStrip } from './src/components/BenchStrip';
import { PitchBoard } from './src/components/PitchBoard';
import { PortfolioSummary } from './src/components/PortfolioSummary';
import { StarCardModal } from './src/components/StarCardModal';
import { mockPortfolio } from './src/data/mockPortfolio';
import {
  buildRecommendedLineup,
  buildSwapCandidateLabel,
  createInitialAssignments,
  getBenchPlayers,
  getLineupPlayer,
  getPitchSlots,
  movePlayerBetweenTargets,
  toggleSlotLock,
  type LineupTarget,
} from './src/lib/lineup';
import type { PortfolioPlayer } from './src/types/portfolio';

export default function App() {
  const [players] = useState(mockPortfolio.players);
  const [lineup, setLineup] = useState(() =>
    createInitialAssignments(buildRecommendedLineup(players)),
  );
  const [selectedPlayer, setSelectedPlayer] = useState<PortfolioPlayer | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<LineupTarget | null>(null);

  const pitchSlots = useMemo(() => getPitchSlots(), []);
  const benchPlayers = useMemo(() => getBenchPlayers(players, lineup), [lineup, players]);
  const totalMarketValue = useMemo(
    () => players.reduce((sum, player) => sum + player.marketValue, 0),
    [players],
  );

  const handleOpenPlayer = (playerId: string | null) => {
    if (!playerId) {
      return;
    }
    const player = players.find((item) => item.id === playerId) ?? null;
    setSelectedPlayer(player);
  };

  const handleSelectTarget = (target: LineupTarget) => {
    if (!selectedTarget) {
      setSelectedTarget(target);
      return;
    }

    if (selectedTarget.kind === target.kind && selectedTarget.id === target.id) {
      setSelectedTarget(null);
      return;
    }

    setLineup((current) => movePlayerBetweenTargets(current, selectedTarget, target));
    setSelectedTarget(null);
  };

  const handleAutoLineup = () => {
    setLineup(createInitialAssignments(buildRecommendedLineup(players)));
    setSelectedTarget(null);
  };

  const handleToggleLock = (slotId: string) => {
    setLineup((current) => toggleSlotLock(current, slotId));
  };

  const highlightedLabel = selectedTarget
    ? buildSwapCandidateLabel(selectedTarget, lineup, players)
    : '点一次卡片进入详情，长按球场位置或替补卡片后再点另一个目标可完成换位。';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Lineup Portfolio</Text>
            <Text style={styles.title}>阵容持仓</Text>
            <Text style={styles.subtitle}>
              用足球阵型管理股票和 ETF，当前版本先跑通阵容与球星卡体验。
            </Text>
          </View>
          <Pressable style={styles.aiButton} onPress={handleAutoLineup}>
            <Text style={styles.aiButtonText}>AI 重新排阵</Text>
          </Pressable>
        </View>

        <PortfolioSummary
          players={players}
          totalMarketValue={totalMarketValue}
          formationName={lineup.formationName}
          updatedAt={mockPortfolio.updatedAt}
        />

        <View style={styles.hintCard}>
          <Text style={styles.hintLabel}>当前操作</Text>
          <Text style={styles.hintText}>{highlightedLabel}</Text>
        </View>

        <PitchBoard
          lineup={lineup}
          slots={pitchSlots}
          onOpenPlayer={handleOpenPlayer}
          onSelectTarget={handleSelectTarget}
          selectedTarget={selectedTarget}
          getPlayer={(playerId) => getLineupPlayer(players, playerId)}
        />

        <BenchStrip
          benchPlayers={benchPlayers}
          onOpenPlayer={(playerId) => handleOpenPlayer(playerId)}
          onSelectBench={(playerId) => handleSelectTarget({ kind: 'bench', id: playerId })}
          selectedTarget={selectedTarget}
        />

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>后续开发路线</Text>
          <Text style={styles.footerText}>1. 券商持仓截图 OCR 导入与人工确认页。</Text>
          <Text style={styles.footerText}>2. AI 阵型建议服务与可解释排阵规则。</Text>
          <Text style={styles.footerText}>3. 手势拖拽、历史快照、延迟行情刷新。</Text>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={Boolean(selectedPlayer)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <StarCardModal
              player={selectedPlayer}
              slot={
                selectedPlayer
                  ? lineup.slots.find((slot) => slot.playerId === selectedPlayer.id) ?? null
                  : null
              }
              onClose={() => setSelectedPlayer(null)}
              onToggleLock={(slotId) => handleToggleLock(slotId)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#08141f',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    gap: 14,
  },
  kicker: {
    color: '#8bd0a7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#f5f8f9',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a9bcc5',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  aiButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#8bd0a7',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  aiButtonText: {
    color: '#0f231d',
    fontWeight: '800',
    fontSize: 14,
  },
  hintCard: {
    backgroundColor: '#0e2130',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f3b4d',
  },
  hintLabel: {
    color: '#7ca5bd',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  hintText: {
    color: '#dce8ec',
    fontSize: 14,
    lineHeight: 20,
  },
  footerCard: {
    backgroundColor: '#0f1d28',
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  footerTitle: {
    color: '#f2f7f8',
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    color: '#a8bcc6',
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 18, 0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#09161f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    minHeight: '62%',
  },
});
