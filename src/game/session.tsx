import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEVELS } from "./levels";
import type { RunResult } from "./engine";
import { initAudio, playSfx, setSfxEnabled } from "./audio";

export type ScreenMode = "title" | "playing" | "paused" | "cleared" | "gameover" | "victory" | "select";
export type TabId = "play" | "chambers" | "guide";

interface Progress {
  cleared: number[];
  best: number;
  times: Record<string, number>;
  unlockAll: boolean;
  soundOn: boolean;
}

const STORAGE_KEY = "glyphquest.save.v1";

const defaultProgress: Progress = {
  cleared: [],
  best: 0,
  times: {},
  unlockAll: false,
  soundOn: true,
};

function parseProgress(raw: string | null): Progress {
  try {
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const cleared = Array.isArray(parsed.cleared)
      ? parsed.cleared.filter((n): n is number => typeof n === "number" && n >= 0 && n < LEVELS.length)
      : [];
    return {
      cleared: Array.from(new Set(cleared)).sort((a, b) => a - b),
      best: typeof parsed.best === "number" && Number.isFinite(parsed.best) ? Math.max(0, Math.floor(parsed.best)) : 0,
      times: parsed.times && typeof parsed.times === "object" ? parsed.times : {},
      unlockAll: Boolean(parsed.unlockAll),
      soundOn: parsed.soundOn !== false,
    };
  } catch {
    return defaultProgress;
  }
}

export interface SessionValue {
  /** false until the saved game has been read from device storage */
  ready: boolean;
  mode: ScreenMode;
  tab: TabId;
  levelIndex: number;
  restartToken: number;
  cleared: number[];
  times: Record<string, number>;
  unlockedThrough: number;
  unlockAll: boolean;
  best: number;
  runScore: number;
  soundOn: boolean;
  clearedResult: RunResult | null;
  notice: string | null;
  confirmReset: boolean;
  setTab: (tab: TabId) => void;
  isUnlocked: (index: number) => boolean;
  startAdventure: () => void;
  playLevel: (index: number) => void;
  pause: () => void;
  resume: () => void;
  restartLevel: () => void;
  nextLevel: () => void;
  restartRun: () => void;
  quitToTitle: () => void;
  openSelect: () => void;
  closeSelect: () => void;
  toggleSound: () => void;
  completeLevel: (result: RunResult) => void;
  failLevel: () => void;
  unlockEveryChamber: () => void;
  askReset: () => void;
  cancelReset: () => void;
  confirmResetSave: () => void;
  dismissNotice: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<ScreenMode>("title");
  const [tab, setTabState] = useState<TabId>("play");
  const [levelIndex, setLevelIndex] = useState(0);
  const [restartToken, setRestartToken] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [clearedResult, setClearedResult] = useState<RunResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const returnModeRef = useRef<ScreenMode>("title");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const { cleared, best, unlockAll, soundOn, times } = progress;

  const unlockedThrough = useMemo(() => {
    if (unlockAll) return LEVELS.length - 1;
    const highest = cleared.length ? Math.max(...cleared) : -1;
    return Math.min(LEVELS.length - 1, highest + 1);
  }, [cleared, unlockAll]);

  const isUnlocked = useCallback(
    (index: number) => unlockAll || cleared.includes(index) || index <= unlockedThrough,
    [unlockAll, cleared, unlockedThrough],
  );

  useEffect(() => {
    setSfxEnabled(soundOn);
  }, [soundOn]);

  // Load the save from device storage once, then start persisting changes.
  useEffect(() => {
    let alive = true;
    initAudio();
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (alive) setProgress(parseProgress(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => {
      /* cartridge memory full — the run continues */
    });
  }, [progress, ready]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const notify = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3800);
  }, []);

  const beginLevel = useCallback((index: number, resetScore = false) => {
    setLevelIndex(index);
    setRestartToken((token) => token + 1);
    setClearedResult(null);
    setMode("playing");
    setTabState("play");
    if (resetScore) setRunScore(0);
  }, []);

  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    if (next !== "play" && modeRef.current === "playing") {
      setMode("paused");
      playSfx("pause");
    }
  }, []);

  const startAdventure = useCallback(() => {
    const next = LEVELS.findIndex((_, i) => !cleared.includes(i));
    beginLevel(next === -1 ? 0 : next, true);
    playSfx("start");
  }, [beginLevel, cleared]);

  const playLevel = useCallback(
    (index: number) => {
      if (!isUnlocked(index)) {
        playSfx("menu");
        notify(`Chamber ${String(index + 1).padStart(2, "0")} is sealed. Clear the chamber before it, or unseal the whole crypt.`);
        return;
      }
      beginLevel(index);
      playSfx("select");
    },
    [beginLevel, isUnlocked, notify],
  );

  const pause = useCallback(() => setMode("paused"), []);
  const resume = useCallback(() => {
    setMode("playing");
    setTabState("play");
  }, []);

  const restartLevel = useCallback(() => {
    beginLevel(levelIndex);
    playSfx("select");
  }, [beginLevel, levelIndex]);

  const nextLevel = useCallback(() => {
    if (levelIndex >= LEVELS.length - 1) {
      setMode("victory");
      playSfx("victory");
      return;
    }
    beginLevel(levelIndex + 1);
    playSfx("start");
  }, [beginLevel, levelIndex]);

  const restartRun = useCallback(() => {
    setRunScore(0);
    beginLevel(0);
    playSfx("start");
  }, [beginLevel]);

  const quitToTitle = useCallback(() => {
    setMode("title");
    setTabState("play");
    setRunScore(0);
    setClearedResult(null);
    setRestartToken((token) => token + 1);
  }, []);

  const openSelect = useCallback(() => {
    setMode((current) => {
      if (current !== "select") returnModeRef.current = current;
      return "select";
    });
    setTabState("play");
  }, []);

  const closeSelect = useCallback(() => {
    const back = returnModeRef.current;
    setMode(back === "select" ? "title" : back);
  }, []);

  const toggleSound = useCallback(() => {
    setProgress((prev) => ({ ...prev, soundOn: !prev.soundOn }));
  }, []);

  const completeLevel = useCallback(
    (result: RunResult) => {
      setRunScore((prev) => {
        const next = prev + result.score;
        setProgress((p) => {
          const prevTime = p.times[String(levelIndex)];
          const better = prevTime === undefined ? result.time : Math.min(prevTime, result.time);
          return {
            ...p,
            cleared: Array.from(new Set([...p.cleared, levelIndex])).sort((a, b) => a - b),
            best: Math.max(p.best, next),
            times: { ...p.times, [String(levelIndex)]: better },
          };
        });
        return next;
      });
      setClearedResult(result);
      setMode("cleared");
    },
    [levelIndex],
  );

  const failLevel = useCallback(() => setMode("gameover"), []);

  const unlockEveryChamber = useCallback(() => {
    setProgress((prev) => ({ ...prev, unlockAll: true }));
    notify("All ten chambers are unsealed. The crypt is yours.");
    playSfx("door");
  }, [notify]);

  const askReset = useCallback(() => setConfirmReset(true), []);
  const cancelReset = useCallback(() => setConfirmReset(false), []);
  const confirmResetSave = useCallback(() => {
    setProgress((prev) => ({ ...defaultProgress, soundOn: prev.soundOn }));
    setMode("title");
    setTabState("play");
    setLevelIndex(0);
    setRunScore(0);
    setClearedResult(null);
    setRestartToken((token) => token + 1);
    setNotice(null);
    setConfirmReset(false);
    playSfx("dead");
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const value: SessionValue = {
    ready,
    mode,
    tab,
    levelIndex,
    restartToken,
    cleared,
    times,
    unlockedThrough,
    unlockAll,
    best,
    runScore,
    soundOn,
    clearedResult,
    notice,
    confirmReset,
    setTab,
    isUnlocked,
    startAdventure,
    playLevel,
    pause,
    resume,
    restartLevel,
    nextLevel,
    restartRun,
    quitToTitle,
    openSelect,
    closeSelect,
    toggleSound,
    completeLevel,
    failLevel,
    unlockEveryChamber,
    askReset,
    cancelReset,
    confirmResetSave,
    dismissNotice,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
