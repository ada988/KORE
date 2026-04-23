"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RsvpEngine, type RsvpFrame } from "@/engines/rsvp";
import { useRsvpStore } from "@/stores/rsvp";
import type { Token } from "@/types/token";

type UseRsvpEngineReturn = {
  currentFrame: RsvpFrame | null;
  isPlaying: boolean;
  progress: number;
  isComplete: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekBack: (wordCount: number) => void;
  setWpm: (wpm: number) => void;
};

/**
 * Bridges the RsvpEngine event emitter to React state.
 * The engine runs outside React's render cycle; only the rendered frame
 * is stored in state to minimize re-renders.
 */
export function useRsvpEngine(tokens: Token[]): UseRsvpEngineReturn {
  const { wpm, chunkSize, adaptivePauses, setWpm: storeSetWpm } = useRsvpStore();

  const engineRef = useRef<RsvpEngine | null>(null);
  const [currentFrame, setCurrentFrame] = useState<RsvpFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // (Re-)create engine when tokens or config changes
  useEffect(() => {
    engineRef.current?.destroy();

    const engine = new RsvpEngine(tokens, { wpm, chunkSize, adaptivePauses });

    const unsub = engine.on((event) => {
      if (event.type === "frame") {
        setCurrentFrame(event.frame);
      } else if (event.type === "progress") {
        setProgress(event.ratio);
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

  // Sync wpm changes to the running engine without rebuilding it
  useEffect(() => {
    engineRef.current?.setWpm(wpm);
  }, [wpm]);

  useEffect(() => {
    engineRef.current?.setChunkSize(chunkSize);
  }, [chunkSize]);

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
    if (isPlaying) {
      pause();
    } else if (isComplete) {
      // Restart: create a new engine
      const engine = new RsvpEngine(tokens, { wpm, chunkSize, adaptivePauses });
      engine.on((event) => {
        if (event.type === "frame") setCurrentFrame(event.frame);
        else if (event.type === "progress") setProgress(event.ratio);
        else if (event.type === "complete") {
          setIsPlaying(false);
          setIsComplete(true);
        }
      });
      engineRef.current?.destroy();
      engineRef.current = engine;
      engine.start();
      setIsPlaying(true);
      setIsComplete(false);
      setProgress(0);
    } else {
      if (currentFrame === null) {
        play();
      } else {
        engineRef.current?.resume();
        setIsPlaying(true);
      }
    }
  }, [isPlaying, isComplete, play, pause, tokens, wpm, chunkSize, adaptivePauses, currentFrame]);

  const seekBack = useCallback((wordCount: number) => {
    engineRef.current?.seekBackWords(wordCount);
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
    isPlaying,
    progress,
    isComplete,
    play,
    pause,
    toggle,
    seekBack,
    setWpm,
  };
}
