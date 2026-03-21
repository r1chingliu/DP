import { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

import type { LineupState, PitchSlot, PortfolioPlayer } from '../types/portfolio';

type PitchBoardProps = {
  lineup: LineupState;
  slots: PitchSlot[];
  activeSlotTargetId: string | null;
  draggingPlayerId: string | null;
  onOpenPlayer: (playerId: string | null) => void;
  onSlotLayout: (
    slotId: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => void;
  onSlotDragStart: (slotId: string, player: PortfolioPlayer, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: (pageX: number, pageY: number) => void;
  getPlayer: (playerId: string | null) => PortfolioPlayer | null;
};

const CARD_WIDTH = 110;
const CARD_HEIGHT = 72;

export function PitchBoard({
  lineup,
  slots,
  activeSlotTargetId,
  draggingPlayerId,
  onOpenPlayer,
  onSlotLayout,
  onSlotDragStart,
  onDragMove,
  onDragEnd,
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
          const isDraggingOrigin = draggingPlayerId === player?.id;
          const isDropTarget = activeSlotTargetId === slot.id;

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
              <DraggableSlotCard
                slot={slot}
                player={player}
                locked={Boolean(assignment?.locked)}
                isDraggingOrigin={Boolean(isDraggingOrigin)}
                isDropTarget={Boolean(isDropTarget)}
                onOpenPlayer={onOpenPlayer}
                onLayout={onSlotLayout}
                onDragStart={onSlotDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            </View>
          );
        })}
      </View>

      <Text style={styles.tip}>
        长按后拖到另一个首发位置可直接换位，拖到某张替补卡上松手会和该替补互换。
      </Text>
    </View>
  );
}

type DraggableSlotCardProps = {
  slot: PitchSlot;
  player: PortfolioPlayer | null;
  locked: boolean;
  isDraggingOrigin: boolean;
  isDropTarget: boolean;
  onOpenPlayer: (playerId: string | null) => void;
  onLayout: (
    slotId: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => void;
  onDragStart: (slotId: string, player: PortfolioPlayer, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: (pageX: number, pageY: number) => void;
};

function DraggableSlotCard({
  slot,
  player,
  locked,
  isDraggingOrigin,
  isDropTarget,
  onOpenPlayer,
  onLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DraggableSlotCardProps) {
  const itemRef = useRef<View | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragEnabledRef = useRef(false);

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLayout = (_event: LayoutChangeEvent) => {
    itemRef.current?.measureInWindow((x, y, width, height) => {
      onLayout(slot.id, { x, y, width, height });
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(player),
        onMoveShouldSetPanResponder: () => Boolean(player),
        onMoveShouldSetPanResponderCapture: () => Boolean(player),
        onPanResponderGrant: (event: GestureResponderEvent) => {
          if (!player || locked) {
            return;
          }

          const { pageX, pageY } = event.nativeEvent;
          dragEnabledRef.current = false;
          longPressTimerRef.current = setTimeout(() => {
            dragEnabledRef.current = true;
            onDragStart(slot.id, player, pageX, pageY);
          }, 260);
        },
        onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          if (!player || locked) {
            return;
          }

          const { pageX, pageY } = event.nativeEvent;
          if (!dragEnabledRef.current) {
            if (Math.hypot(gestureState.dx, gestureState.dy) > 24) {
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
          } else if (player) {
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
    [locked, onDragEnd, onDragMove, onDragStart, onOpenPlayer, player, slot.id],
  );

  return (
    <View
      ref={itemRef}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
      style={[
        styles.slotButton,
        locked && styles.lockedSlot,
        isDropTarget && styles.slotSelected,
        isDraggingOrigin && styles.dragOrigin,
      ]}
    >
      <Text style={styles.slotCode}>{slot.shortLabel}</Text>
      {player ? (
        <>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={[styles.playerPnl, { color: player.pnlPercent >= 0 ? '#ffd1c2' : '#8ef0ba' }]}>
            {player.pnlPercent >= 0 ? '+' : ''}
            {player.pnlPercent.toFixed(1)}%
          </Text>
        </>
      ) : (
        <Text style={styles.emptyLabel}>空位</Text>
      )}
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
    width: CARD_WIDTH,
    marginLeft: -CARD_WIDTH / 2,
    marginTop: -CARD_HEIGHT / 2,
  },
  slotButton: {
    backgroundColor: 'rgba(8, 20, 31, 0.82)',
    borderRadius: 18,
    minHeight: CARD_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 211, 0.28)',
    alignItems: 'center',
  },
  slotSelected: {
    borderColor: '#ffe7a5',
    transform: [{ scale: 1.04 }],
  },
  lockedSlot: {
    borderColor: '#ffb26c',
  },
  dragOrigin: {
    opacity: 0.18,
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
