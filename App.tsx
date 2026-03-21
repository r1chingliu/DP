import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BenchStrip } from './src/components/BenchStrip';
import { ChemistryCard } from './src/components/ChemistryCard';
import { ImportReviewScreen } from './src/components/ImportReviewScreen';
import { PitchBoard } from './src/components/PitchBoard';
import { PortfolioSummary } from './src/components/PortfolioSummary';
import { SeasonHonorsCard } from './src/components/SeasonHonorsCard';
import { StarCardModal } from './src/components/StarCardModal';
import { WeeklyChallengeCard } from './src/components/WeeklyChallengeCard';
import { mockPortfolio } from './src/data/mockPortfolio';
import {
  buildChemistryBreakdown,
  buildSeasonHonors,
  buildWeeklyChallenge,
} from './src/lib/gameplay';
import {
  buildRecommendedLineup,
  createInitialAssignments,
  getBenchPlayers,
  getLineupPlayer,
  getPitchSlots,
  movePlayerBetweenTargets,
  toggleSlotLock,
  type LineupTarget,
} from './src/lib/lineup';
import { buildPlayersFromExtraction, normalizeExtractedRows } from './src/lib/portfolio';
import { extractPortfolioFromBackend } from './src/services/backend';
import { requestAiLineupSuggestion } from './src/services/lineup';
import type {
  AiLineupSuggestion,
  ExtractedHoldingRow,
  OcrExtractionResult,
  PortfolioPlayer,
} from './src/types/portfolio';

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  source: LineupTarget;
  player: PortfolioPlayer;
  pageX: number;
  pageY: number;
};

export default function App() {
  const [players, setPlayers] = useState(mockPortfolio.players);
  const [updatedAt, setUpdatedAt] = useState(mockPortfolio.updatedAt);
  const [lineup, setLineup] = useState(() =>
    createInitialAssignments(buildRecommendedLineup(mockPortfolio.players)),
  );
  const [selectedPlayer, setSelectedPlayer] = useState<PortfolioPlayer | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isRequestingAi, setIsRequestingAi] = useState(false);
  const [extraction, setExtraction] = useState<OcrExtractionResult | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiLineupSuggestion | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [slotLayouts, setSlotLayouts] = useState<Record<string, Rect>>({});
  const [benchLayouts, setBenchLayouts] = useState<Record<string, Rect>>({});

  const pitchSlots = useMemo(() => getPitchSlots(), []);
  const benchPlayers = useMemo(() => getBenchPlayers(players, lineup), [lineup, players]);
  const totalMarketValue = useMemo(
    () => players.reduce((sum, player) => sum + player.marketValue, 0),
    [players],
  );
  const chemistry = useMemo(() => buildChemistryBreakdown(players, lineup), [lineup, players]);
  const weeklyChallenge = useMemo(() => buildWeeklyChallenge(players, lineup), [lineup, players]);
  const seasonHonors = useMemo(() => buildSeasonHonors(players, lineup), [lineup, players]);

  const dragTarget = useMemo(() => {
    if (!dragState) {
      return null;
    }
    return resolveDragTarget(
      dragState.pageX,
      dragState.pageY,
      dragState.source,
      slotLayouts,
      benchLayouts,
    );
  }, [benchLayouts, dragState, slotLayouts]);

  const handleOpenPlayer = (playerId: string | null) => {
    if (!playerId) {
      return;
    }
    const player = players.find((item) => item.id === playerId) ?? null;
    setSelectedPlayer(player);
  };

  const handleAutoLineup = async () => {
    try {
      setIsRequestingAi(true);
      const suggestion = await requestAiLineupSuggestion(players);
      setAiSuggestion(suggestion);
      setLineup(createInitialAssignments(buildRecommendedLineup(players)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 排阵请求失败，请稍后重试。';
      Alert.alert('AI 排阵失败', message);
    } finally {
      setIsRequestingAi(false);
    }
  };

  const handleToggleLock = (slotId: string) => {
    setLineup((current) => toggleSlotLock(current, slotId));
  };

  const handleImportScreenshot = async () => {
    try {
      setIsImporting(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相册权限', '请允许访问相册后再选择券商持仓截图。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const nextExtraction = await extractPortfolioFromBackend(result.assets[0]);
      setExtraction({
        ...nextExtraction,
        rows: normalizeExtractedRows(nextExtraction.rows),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '截图导入失败，请稍后重试。';
      Alert.alert('导入失败', message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateRow = (rowId: string, patch: Partial<ExtractedHoldingRow>) => {
    setExtraction((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
          }
        : current,
    );
  };

  const handleConfirmImport = async () => {
    if (!extraction) {
      return;
    }

    setIsSubmittingImport(true);
    const importedPlayers = buildPlayersFromExtraction(extraction.rows);
    setPlayers(importedPlayers);
    setUpdatedAt(extraction.extractedAt);
    setLineup(createInitialAssignments(buildRecommendedLineup(importedPlayers)));
    setExtraction(null);
    setAiSuggestion(null);
    setIsSubmittingImport(false);
  };

  const handleSlotLayout = (slotId: string, layout: Rect) => {
    setSlotLayouts((current) => ({ ...current, [slotId]: layout }));
  };

  const handleBenchLayout = (playerId: string, layout: Rect) => {
    setBenchLayouts((current) => ({ ...current, [playerId]: layout }));
  };

  const handleSlotDragStart = (slotId: string, player: PortfolioPlayer, pageX: number, pageY: number) => {
    setDragState({
      source: { kind: 'slot', id: slotId },
      player,
      pageX,
      pageY,
    });
  };

  const handleBenchDragStart = (playerId: string, pageX: number, pageY: number) => {
    const player = players.find((item) => item.id === playerId);
    if (!player) {
      return;
    }

    setDragState({
      source: { kind: 'bench', id: playerId },
      player,
      pageX,
      pageY,
    });
  };

  const handleDragMove = (pageX: number, pageY: number) => {
    setDragState((current) => (current ? { ...current, pageX, pageY } : null));
  };

  const handleDragEnd = (pageX: number, pageY: number) => {
    setDragState((current) => {
      if (!current) {
        return null;
      }

      const target = resolveDragTarget(pageX, pageY, current.source, slotLayouts, benchLayouts);
      if (target && !isSameTarget(current.source, target)) {
        setLineup((lineupState) => movePlayerBetweenTargets(lineupState, current.source, target));
      }

      return null;
    });
  };

  const dragCardStyle = dragState
    ? {
        left: dragState.pageX - 55,
        top: dragState.pageY - 36,
      }
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Lineup Portfolio</Text>
            <Text style={styles.title}>阵容持仓</Text>
            <Text style={styles.subtitle}>
              用足球阵型管理股票和 ETF。当前版本支持截图导入、字段确认、首发替补互换和 AI 阵容点评。
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={handleImportScreenshot}
              disabled={isImporting}
            >
              <Text style={styles.secondaryButtonText}>
                {isImporting ? '识别中...' : '导入截图'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.aiButton}
              onPress={handleAutoLineup}
              disabled={isRequestingAi}
            >
              <Text style={styles.aiButtonText}>
                {isRequestingAi ? 'AI 思考中...' : 'AI 重新排阵'}
              </Text>
            </Pressable>
          </View>
        </View>

        <PortfolioSummary
          players={players}
          totalMarketValue={totalMarketValue}
          formationName={aiSuggestion?.formationName || lineup.formationName}
          updatedAt={updatedAt}
        />

        <WeeklyChallengeCard {...weeklyChallenge} />

        <ChemistryCard
          attack={chemistry.attack}
          control={chemistry.control}
          defense={chemistry.defense}
          balance={chemistry.balance}
          total={chemistry.total}
        />

        {aiSuggestion ? (
          <View style={styles.aiCard}>
            <Text style={styles.aiTitle}>AI 阵容点评</Text>
            <Text style={styles.aiMeta}>建议阵型：{aiSuggestion.formationName}</Text>
            <Text style={styles.aiSummary}>{aiSuggestion.summary}</Text>
          </View>
        ) : null}

        <View style={styles.hintCard}>
          <Text style={styles.hintLabel}>当前操作</Text>
          <Text style={styles.hintText}>
            轻点卡片进入详情。长按首发或替补卡片后直接拖动，松手时会按落点和目标球员自动换位。
          </Text>
        </View>

        <PitchBoard
          lineup={lineup}
          slots={pitchSlots}
          activeSlotTargetId={dragTarget?.kind === 'slot' ? dragTarget.id : null}
          draggingPlayerId={dragState?.player.id ?? null}
          onOpenPlayer={handleOpenPlayer}
          onSlotLayout={handleSlotLayout}
          onSlotDragStart={handleSlotDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          getPlayer={(playerId) => getLineupPlayer(players, playerId)}
        />

        <BenchStrip
          benchPlayers={benchPlayers}
          activeBenchTargetId={dragTarget?.kind === 'bench' ? dragTarget.id : null}
          draggingPlayerId={dragState?.player.id ?? null}
          onOpenPlayer={(playerId) => handleOpenPlayer(playerId)}
          onBenchItemLayout={handleBenchLayout}
          onBenchDragStart={handleBenchDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />

        <SeasonHonorsCard honors={seasonHonors} />
      </ScrollView>

      {dragState && dragCardStyle ? (
        <View pointerEvents="none" style={[styles.dragCard, dragCardStyle]}>
          <Text style={styles.dragTicker}>{dragState.player.ticker}</Text>
          <Text style={styles.dragName}>{dragState.player.name}</Text>
          <Text
            style={[
              styles.dragPnl,
              { color: dragState.player.pnlPercent >= 0 ? '#ffd1c2' : '#8ef0ba' },
            ]}
          >
            {dragState.player.pnlPercent >= 0 ? '+' : ''}
            {dragState.player.pnlPercent.toFixed(1)}%
          </Text>
        </View>
      ) : null}

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
              aiNote={
                selectedPlayer
                  ? aiSuggestion?.playerNotes.find((item) => item.playerId === selectedPlayer.id)?.note ??
                    null
                  : null
              }
              onClose={() => setSelectedPlayer(null)}
              onToggleLock={(slotId) => handleToggleLock(slotId)}
            />
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={Boolean(extraction)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.importModalCard}>
            {extraction ? (
              <ImportReviewScreen
                extraction={extraction}
                isSubmitting={isSubmittingImport}
                onBack={() => setExtraction(null)}
                onConfirm={handleConfirmImport}
                onUpdateRow={handleUpdateRow}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function isSameTarget(source: LineupTarget, target: LineupTarget) {
  return source.kind === target.kind && source.id === target.id;
}

function resolveDragTarget(
  pageX: number,
  pageY: number,
  source: LineupTarget,
  slotLayouts: Record<string, Rect>,
  benchLayouts: Record<string, Rect>,
): LineupTarget | null {
  const benchTarget = Object.entries(benchLayouts).find(([, rect]) => pointInRect(pageX, pageY, rect));
  if (benchTarget) {
    return { kind: 'bench', id: benchTarget[0] };
  }

  let nearestSlotId: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [slotId, rect] of Object.entries(slotLayouts)) {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const distance = Math.hypot(centerX - pageX, centerY - pageY);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSlotId = slotId;
    }
  }

  if (!nearestSlotId) {
    return source;
  }

  return { kind: 'slot', id: nearestSlotId };
}

function pointInRect(pageX: number, pageY: number, rect: Rect) {
  return (
    pageX >= rect.x &&
    pageX <= rect.x + rect.width &&
    pageY >= rect.y &&
    pageY <= rect.y + rect.height
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#123346',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#d7edf7',
    fontWeight: '800',
    fontSize: 14,
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
  aiCard: {
    backgroundColor: '#d8eee1',
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  aiTitle: {
    color: '#173526',
    fontSize: 18,
    fontWeight: '800',
  },
  aiMeta: {
    color: '#50705b',
    fontSize: 13,
    fontWeight: '700',
  },
  aiSummary: {
    color: '#294330',
    fontSize: 14,
    lineHeight: 21,
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
  dragCard: {
    position: 'absolute',
    width: 110,
    minHeight: 72,
    backgroundColor: '#0d2330',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffe7a5',
    alignItems: 'center',
    zIndex: 30,
  },
  dragTicker: {
    color: '#97d9b0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dragName: {
    color: '#f4faf7',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  dragPnl: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
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
  importModalCard: {
    backgroundColor: '#09161f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: '88%',
  },
});
