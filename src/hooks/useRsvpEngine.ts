"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RsvpEngine, type RsvpFrame } from "@/engines/rsvp";
import { useRsvpStore } from "@/stores/rsvp";
import type { Token } from "@/types/token";

type UseRsvpEngineReturn = {
  currentFrame: RsvpFrame | null;
  effectiveWpm: number;
  isPlaying: boolean;
  progress: number;
  currentIdx: number;
  isComplete: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekBack: (wordCount: number) => void;
  seekForward: (wordCount: number) => void;
  seekToIdx: (idx: number) => void;
  setWpm: (wpm: number) => void;
};

type Options = { startIdx?: number };

export function useRsvpEngine(tokens: Token[], options: Options = {}): UseRsvpEngineReturn {
  const wpm = useRsvpStore((s) => s.wpm);
  const chunkSize = useRsvpStore((s) => s.chunkSize);
  const adaptivePauses = useRsvpStore((s) => s.adaptivePauses);
  const speedMode = useRsvpStore((s) => s.speedMode);
  const progressiveRampPerMin = useRsvpStore((s) => s.progressiveRampPerMin);
  const speedCeiling = useRsvpStore((s) => s.speedCeiling);
  const speedFloor = useRsvpStore((s) => s.speedFloor);
  const burstBoost = useRsvpStore((s) => s.burstBoost);
  const burstSprintSec = useRsvpStore((s) => s.burstSprintSec);
  const burstRestSec = useRsvpStore((s) => s.burstRestSec);
  const storeSetWpm = useRsvpStore((s) => s.setWpm);

  const engineRef = useRef<RsvpEngine | null>(null);
  const [currentFrame, setCurrentFrame] = useState<RsvpFrame | null>(null);
  const [effectiveWpm, setEffectiveWpm] = useState<number>(wpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(options.startIdx ?? 0);
  const [isComplete, setIsComplete] = useState(false);
  const startIdxRef = useRef(options.startIdx ?? 0);

  useEffect(() => {
    engineRef.current?.destroy();

    const engine = new RsvpEngine(tokens, {
      wpm,
      chunkSize,
      adaptivePauses,
      speedMode,
      progressiveRampPerMin,
      speedCeiling,
      speedFloor,
      burstBoost,
      burstSprintSec,
      burstRestSec,
      startIdx: startIdxRef.current,
    });

    const unsub = engine.on((event) => {
      if (event.type === "frame") {
        setCurrentFrame(event.frame);
        setEffectiveWpm(event.frame.effectiveWpm);
        setCurrentIdx(event.frame.startIdx);
      } else if (event.type === "progress") {
        setProgress(event.ratio);
      } else if (event.type === "wpm") {
        setEffectiveWpm(event.wpm);
      } else if (event.type === "complete") {
        setIsPlaying(false);
        setIsComplete(true);
      }
    });

    engineRef.current = engine;

    return () => {
      unsub();
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  useEffect(() => {
    engineRef.current?.setWpm(wpm);
  }, [wpm]);

  useEffect(() => {
    engineRef.current?.setChunkSize(chunkSize);
  }, [chunkSize]);

  useEffect(() => {
    engineRef.current?.setAdaptivePauses(adaptivePauses);
  }, [adaptivePauses]);

  useEffect(() => {
    engineRef.current?.updateSpeedConfig({
      speedMode,
      progressiveRampPerMin,
      speedCeiling,
      speedFloor,
      burstBoost,
      burstSprintSec,
      burstRestSec,
    });
  }, [speedMode, progressiveRampPerMin, speedCeiling, speedFloor, burstBoost, burstSprintSec, burstRestSec]);

  const play = useCallback(() => {
    engineRef.current?.start();
    setIsPlaying(true);
    setIsComplete(false);
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isPlaying) {
      pause();
    } else if (isComplete) {
      engine.seekToIdx(0);
      engine.start();
      setIsPlaying(true);
      setIsComplete(false);
      setProgress(0);
    } else if (currentFrame === null) {
      play();
    } else {
      engine.resume();
      setIsPlaying(true);
    }
  }, [isPlaying, isComplete, play, pause, currentFrame]);

  const seekBack = useCallback((count: number) => {
    engineRef.current?.seekBackWords(count);
    if (engineRef.current) setCurrentIdx(engineRef.current.currentIndex);
  }, []);

  const seekForward = useCallback((count: number) => {
    engineRef.current?.seekBackWords(-count);
    if (engineRef.current) setCurrentIdx(engineRef.current.currentIndex);
  }, []);

  const seekToIdx = useCallback((idx: number) => {
    engineRef.current?.seekToIdx(idx);
    setCurrentIdx(idx);
  }, []);

  const setWpm = useCallback(
    (newWpm: number) => {
      storeSetWpm(newWpm);
      engineRef.current?.setWpm(newWpm);
    },
    [storeSetWpm],
  );

  return {
    currentFrame,
    effectiveWpm,
    isPlaying,
    progress,
    currentIdx,
    isComplete,
    play,
    pause,
    toggle,
    seekBack,
    seekForward,
    seekToIdx,
    setWpm,
  };
}
