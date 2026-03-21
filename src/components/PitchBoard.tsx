import { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import type { LineupState, PitchSlot, PortfolioPlayer } from '../types/portfolio';

type PitchBoardProps = {
  lineup: LineupState;
  slots: PitchSlot[];
  onOpenPlayer: (playerId: string | null) => void;
  onMovePlayer: (sourceSlotId: string, targetSlotId: string) => void;
  getPlayer: (playerId: string | null) => PortfolioPlayer | null;
};

type DragState = {
  sourceSlotId: string;
  player: PortfolioPlayer;
  pageX: number;
  pageY: number;
  targetSlotId: string | null;
};

type PitchBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function PitchBoard({
  lineup,
  slots,
  onOpenPlayer,
  onMovePlayer,
  getPlayer,
}: PitchBoardProps) {
  const pitchRef = useRef<View | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pitchBounds, setPitchBounds] = useState<PitchBounds | null>(null);

  const refreshPitchBounds = () => {
    pitchRef.current?.measureInWindow((x, y, width, height) => {
      setPitchBounds({ x, y, width, height });
    });
  };

  const handlePitchLayout = (_event: LayoutChangeEvent) => {
    requestAnimationFrame(refreshPitchBounds);
  };

  const findNearestSlotId = (pageX: number, pageY: number) => {
    if (!pitchBounds) {
      return null;
    }

    let winner: { slotId: string; distance: number } | null = null;
    for (const slot of slots) {
      const slotX = pitchBounds.x + (pitchBounds.width * slot.x) / 100;
      const slotY = pitchBounds.y + (pitchBounds.height * slot.y) / 100;
      const distance = Math.hypot(slotX - pageX, slotY - pageY);

      if (!winner || distance < winner.distance) {
        winner = { slotId: slot.id, distance };
      }
    }

    return winner?.slotId ?? null;
  };

  const handleDragStart = (slotId: string, player: PortfolioPlayer, pageX: number, pageY: number) => {
    const targetSlotId = findNearestSlotId(pageX, pageY);
    setDragState({
      sourceSlotId: slotId,
      player,
      pageX,
      pageY,
      targetSlotId,
    });
  };

  const handleDragMove = (pageX: number, pageY: number) => {
    setDragState((current) =>
      current
        ? {
            ...current,
            pageX,
            pageY,
            targetSlotId: findNearestSlotId(pageX, pageY),
          }
        : current,
    );
  };

  const handleDragEnd = (pageX: number, pageY: number) => {
    setDragState((current) => {
      if (!current) {
        return null;
      }

      const targetSlotId = findNearestSlotId(pageX, pageY);
      if (targetSlotId && targetSlotId !== current.sourceSlotId) {
        onMovePlayer(current.sourceSlotId, targetSlotId);
      }

      return null;
    });
  };

  const dragCardStyle =
    dragState && pitchBounds
      ? {
          left: dragState.pageX - pitchBounds.x - 55,
          top: dragState.pageY - pitchBounds.y - 36,
        }
      : null;

  return (
    <View style={styles.shell}>
      <Text style={styles.title}>首发阵容</Text>
      <View ref={pitchRef} style={styles.pitch} onLayout={handlePitchLayout}>
        <View style={styles.centerCircle} />
        <View style={styles.penaltyTop} />
        <View style={styles.penaltyBottom} />

        {slots.map((slot) => {
          const assignment = lineup.slots.find((item) => item.slotId === slot.id);
          const player = getPlayer(assignment?.playerId ?? null);
          const isDraggingOrigin = dragState?.sourceSlotId === slot.id;
          const isDropTarget = dragState?.targetSlotId === slot.id;

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
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            </View>
          );
        })}

        {dragState && dragCardStyle ? (
          <View pointerEvents="none" style={[styles.dragCard, dragCardStyle]}>
            <Text style={styles.slotCode}>{dragState.player.ticker}</Text>
            <Text style={styles.playerName}>{dragState.player.name}</Text>
            <Text
              style={[
                styles.playerPnl,
                { color: dragState.player.pnlPercent >= 0 ? '#ffd1c2' : '#8ef0ba' },
              ]}
            >
              {dragState.player.pnlPercent >= 0 ? '+' : ''}
              {dragState.player.pnlPercent.toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.tip}>长按首发球员后拖动，松手会吸附到最近位置并与目标球员换位。</Text>
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
  onDragStart,
  onDragMove,
  onDragEnd,
}: DraggableSlotCardProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragEnabledRef = useRef(false);
  const gestureStartRef = useRef<{ pageX: number; pageY: number } | null>(null);

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleGrant = (event: GestureResponderEvent) => {
    if (!player || locked) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    gestureStartRef.current = { pageX, pageY };
    dragEnabledRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      dragEnabledRef.current = true;
      onDragStart(slot.id, player, pageX, pageY);
    }, 220);
  };

  const handleMove = (event: GestureResponderEvent) => {
    if (!player || locked) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    const start = gestureStartRef.current;
    if (!start) {
      return;
    }

    if (!dragEnabledRef.current) {
      const distance = Math.hypot(pageX - start.pageX, pageY - start.pageY);
      if (distance > 8) {
        clearTimer();
      }
      return;
    }

    onDragMove(pageX, pageY);
  };

  const handleRelease = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;

    if (dragEnabledRef.current) {
      onDragEnd(pageX, pageY);
    } else if (player) {
      onOpenPlayer(player.id);
    }

    clearTimer();
    dragEnabledRef.current = false;
    gestureStartRef.current = null;
  };

  const handleTerminate = () => {
    clearTimer();
    dragEnabledRef.current = false;
    gestureStartRef.current = null;
  };

  return (
    <View
      onStartShouldSetResponder={() => Boolean(player)}
      onMoveShouldSetResponder={() => Boolean(player)}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleTerminate}
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
          <Text
            style={[styles.playerPnl, { color: player.pnlPercent >= 0 ? '#ffd1c2' : '#8ef0ba' }]}
          >
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
    width: 110,
    marginLeft: -55,
    marginTop: -36,
  },
  slotButton: {
    backgroundColor: 'rgba(8, 20, 31, 0.82)',
    borderRadius: 18,
    minHeight: 72,
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
    zIndex: 20,
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
