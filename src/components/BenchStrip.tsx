import { useMemo, useRef } from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

import type { PortfolioPlayer } from '../types/portfolio';

type BenchStripProps = {
  benchPlayers: PortfolioPlayer[];
  activeBenchTargetId: string | null;
  draggingPlayerId: string | null;
  onOpenPlayer: (playerId: string) => void;
  onBenchItemLayout: (playerId: string, layout: { x: number; y: number; width: number; height: number }) => void;
  onBenchDragStart: (playerId: string, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: (pageX: number, pageY: number) => void;
};

export function BenchStrip({
  benchPlayers,
  activeBenchTargetId,
  draggingPlayerId,
  onOpenPlayer,
  onBenchItemLayout,
  onBenchDragStart,
  onDragMove,
  onDragEnd,
}: BenchStripProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>替补席</Text>
        <Text style={styles.subtitle}>现在支持从替补拖到首发，也支持把首发拖到某个替补卡上交换。</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {benchPlayers.map((player) => (
          <BenchItem
            key={player.id}
            player={player}
            selected={activeBenchTargetId === player.id}
            dimmed={draggingPlayerId === player.id}
            onOpenPlayer={onOpenPlayer}
            onLayout={onBenchItemLayout}
            onDragStart={onBenchDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function BenchItem({
  player,
  selected,
  dimmed,
  onOpenPlayer,
  onLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  player: PortfolioPlayer;
  selected: boolean;
  dimmed: boolean;
  onOpenPlayer: (playerId: string) => void;
  onLayout: (playerId: string, layout: { x: number; y: number; width: number; height: number }) => void;
  onDragStart: (playerId: string, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: (pageX: number, pageY: number) => void;
}) {
  const itemRef = useRef<View | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragEnabledRef = useRef(false);

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const { pageX, pageY } = event.nativeEvent;
          dragEnabledRef.current = false;
          longPressTimerRef.current = setTimeout(() => {
            dragEnabledRef.current = true;
            onDragStart(player.id, pageX, pageY);
          }, 220);
        },
        onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const { pageX, pageY } = event.nativeEvent;
          if (!dragEnabledRef.current) {
            if (Math.hypot(gestureState.dx, gestureState.dy) > 12) {
              clearTimer();
            }
            return;
          }
          onDragMove(pageX, pageY);
        },
        onPanResponderRelease: (event: GestureResponderEvent) => {
          const { pageX, pageY } = event.nativeEvent;
          if (dragEnabledRef.current) {
            onDragEnd(pageX, pageY);
          } else {
            onOpenPlayer(player.id);
          }
          clearTimer();
          dragEnabledRef.current = false;
        },
        onPanResponderTerminate: () => {
          clearTimer();
          dragEnabledRef.current = false;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [player.id, onDragEnd, onDragMove, onDragStart, onOpenPlayer],
  );

  const handleLayout = (_event: LayoutChangeEvent) => {
    itemRef.current?.measureInWindow((x, y, width, height) => {
      onLayout(player.id, { x, y, width, height });
    });
  };

  return (
    <View
      ref={itemRef}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
      style={[styles.item, selected && styles.selected, dimmed && styles.dimmed]}
    >
      <Text style={styles.name}>{player.name}</Text>
      <Text style={styles.meta}>{player.roleLabel}</Text>
      <Text style={[styles.pnl, { color: player.pnlPercent >= 0 ? '#ff9d86' : '#79dcaa' }]}>
        {player.pnlPercent >= 0 ? '+' : ''}
        {player.pnlPercent.toFixed(1)}%
      </Text>
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
  selected: {
    borderColor: '#ffe7a5',
    transform: [{ scale: 1.03 }],
  },
  dimmed: {
    opacity: 0.2,
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
