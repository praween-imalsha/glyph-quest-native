import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../ui";
import { LEVELS } from "../game/levels";
import {
  computeResult,
  createWorld,
  emptyInput,
  requestDash,
  requestHint,
  stepWorld,
  type GameEvent,
  type InputState,
  type RunResult,
  type World,
} from "../game/engine";
import { buildStaticLayers, renderTitleScene, renderWorld, type StaticLayers } from "../game/render";
import { buzz, playSfx } from "../game/audio";
import { useSession, type ScreenMode } from "../game/session";
import { colors, fonts, shadow } from "../theme";
import { PixelIcon } from "./PixelIcon";
import { GameCanvas, type GameCanvasHandle } from "./GameCanvas";
import { Dpad, RoundButton } from "./Controls";

interface HudState {
  hearts: number;
  glyphs: number;
  total: number;
  time: number;
  doorOpen: boolean;
}

const snapshot = (world: World): HudState => ({
  hearts: world.hearts,
  glyphs: world.glyphsCollected,
  total: Math.max(1, world.totalGlyphs),
  time: Math.floor(world.time),
  doorOpen: world.doorOpen,
});

const pad2 = (n: number) => String(n).padStart(2, "0");

function ScreenButton({
  label,
  onPress,
  solid,
  ghost,
}: {
  label: string;
  onPress: () => void;
  solid?: boolean;
  ghost?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.screenBtn,
        solid && styles.screenBtnSolid,
        ghost && styles.screenBtnGhost,
        pressed && styles.screenBtnPressed,
      ]}
    >
      <Text style={[styles.screenBtnText, solid && styles.screenBtnTextSolid, ghost && styles.screenBtnTextGhost]}>{label}</Text>
    </Pressable>
  );
}

function Overlay({ tone, children }: { tone: "light" | "dark"; children: ReactNode }) {
  return (
    <View style={[styles.overlay, tone === "dark" ? styles.overlayDark : styles.overlayLight]} pointerEvents="auto">
      {children}
    </View>
  );
}

export default function Console() {
  const session = useSession();
  const { mode, levelIndex, restartToken, cleared, unlockedThrough, clearedResult, runScore, best, soundOn } = session;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 390;
  const dpadSize = compact ? 78 : 96;
  // Everything on screen except the LCD is roughly 470dp tall. On short phones, narrow the LCD
  // so the D-pad and buttons never fall below the fold (the page cannot scroll while playing).
  const fieldMaxWidth = Math.max(190, (height - insets.top - insets.bottom - 470) * (160 / 128));

  const [powered, setPowered] = useState(true);
  const [hud, setHud] = useState<HudState>({ hearts: 3, glyphs: 0, total: 2, time: 0, doorOpen: false });
  const [cursor, setCursor] = useState(levelIndex);
  const [localResult, setLocalResult] = useState<RunResult | null>(null);
  const [introVisible, setIntroVisible] = useState(true);

  const canvasRef = useRef<GameCanvasHandle | null>(null);
  const layersRef = useRef<StaticLayers | null>(null);
  const worldRef = useRef<World | null>(null);
  const inputRef = useRef<InputState>(emptyInput());
  const resolvedRef = useRef(false);
  const lastHudPush = useRef(0);
  const cursorRef = useRef(levelIndex);
  cursorRef.current = cursor;
  const modeRef = useRef<ScreenMode>(mode);
  modeRef.current = mode;
  const introRef = useRef(introVisible);
  introRef.current = introVisible;
  const progressRef = useRef({ cleared, unlockedThrough });
  progressRef.current = { cleared, unlockedThrough };
  const actionsRef = useRef(session);
  actionsRef.current = session;

  const paint = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (modeRef.current === "title" && worldRef.current === null) {
      canvas.draw((ctx) => renderTitleScene(ctx, time));
      return;
    }
    const world = worldRef.current;
    if (!world) return;
    const layers = layersRef.current;
    canvas.draw((ctx) => renderWorld(ctx, world, time, layers));
  }, []);

  useEffect(() => {
    const world = createWorld(LEVELS[levelIndex]);
    worldRef.current = world;
    layersRef.current = buildStaticLayers(world);
    resolvedRef.current = false;
    inputRef.current = emptyInput();
    setLocalResult(null);
    setHud(snapshot(world));
    setCursor(levelIndex);
    cursorRef.current = levelIndex;
    setIntroVisible(true);
    paint(world.time);
  }, [levelIndex, restartToken, paint]);

  useEffect(() => {
    if (mode !== "playing") return;
    const timer = setTimeout(() => setIntroVisible(false), 3400);
    return () => clearTimeout(timer);
  }, [mode, levelIndex, restartToken]);

  useEffect(() => {
    if (mode !== "playing" || !powered) {
      paint(worldRef.current?.time ?? performance.now() / 1000);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const world = worldRef.current;
      if (!world) return;
      const dt = Math.min(0.045, Math.max(0, (now - last) / 1000));
      last = now;
      const events: GameEvent[] = [];
      stepWorld(world, inputRef.current, dt, events);
      for (const event of events) {
        if (event === "glyph" || event === "hurt" || event === "door" || event === "dash") playSfx(event);
        if (event === "hurt") buzz("heavy");
        else if (event === "door") buzz("success");
        else if (event === "glyph") buzz("light");
      }
      paint(world.time);
      if (now - lastHudPush.current > 90) {
        lastHudPush.current = now;
        const next = snapshot(world);
        setHud((prev) =>
          prev.hearts === next.hearts && prev.glyphs === next.glyphs && prev.total === next.total && prev.time === next.time && prev.doorOpen === next.doorOpen
            ? prev
            : next,
        );
      }
      if (!resolvedRef.current) {
        if (world.status === "cleared") {
          resolvedRef.current = true;
          const result = computeResult(world);
          setLocalResult(result);
          playSfx("clear");
          actionsRef.current.completeLevel(result);
        } else if (world.status === "dead") {
          resolvedRef.current = true;
          playSfx("dead");
          actionsRef.current.failLevel();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode, powered, levelIndex, restartToken, paint]);

  useEffect(() => {
    if (mode === "select") setCursor(Math.min(levelIndex, LEVELS.length - 1));
  }, [mode, levelIndex]);

  const setDirection = useCallback((dir: keyof Omit<InputState, "dash">, down: boolean) => {
    inputRef.current[dir] = down;
    if (down && introRef.current) setIntroVisible(false);
  }, []);

  const doDash = () => {
    if (modeRef.current !== "playing" || !worldRef.current) return;
    const events: GameEvent[] = [];
    requestDash(worldRef.current, events);
    if (events.includes("dash")) playSfx("dash");
  };

  const doHint = () => {
    if (modeRef.current !== "playing" || !worldRef.current) return;
    requestHint(worldRef.current);
    playSfx("hint");
  };

  const tryChoose = (index: number) => {
    const { cleared: clearedNow, unlockedThrough: unlocks } = progressRef.current;
    if (clearedNow.includes(index) || index <= unlocks) actionsRef.current.playLevel(index);
    else playSfx("menu");
  };

  const moveCursor = (delta: number) => {
    const next = Math.max(0, Math.min(LEVELS.length - 1, cursorRef.current + delta));
    cursorRef.current = next;
    setCursor(next);
    playSfx("menu");
  };

  const handleA = () => {
    const acts = actionsRef.current;
    switch (modeRef.current) {
      case "title":
        acts.startAdventure();
        break;
      case "playing":
        doDash();
        break;
      case "paused":
        playSfx("select");
        acts.resume();
        break;
      case "cleared":
        acts.nextLevel();
        break;
      case "gameover":
        acts.restartLevel();
        break;
      case "victory":
        acts.restartRun();
        break;
      case "select":
        tryChoose(cursorRef.current);
        break;
    }
  };

  const handleB = () => {
    const acts = actionsRef.current;
    switch (modeRef.current) {
      case "title":
        playSfx("menu");
        acts.openSelect();
        break;
      case "playing":
        doHint();
        break;
      case "paused":
        playSfx("menu");
        acts.quitToTitle();
        break;
      case "cleared":
        playSfx("menu");
        acts.setTab("chambers");
        break;
      case "gameover":
        playSfx("menu");
        acts.quitToTitle();
        break;
      case "select":
        playSfx("menu");
        acts.closeSelect();
        break;
      case "victory":
        playSfx("menu");
        acts.quitToTitle();
        break;
    }
  };

  const handleStart = () => {
    const acts = actionsRef.current;
    switch (modeRef.current) {
      case "title":
        acts.startAdventure();
        break;
      case "playing":
        playSfx("pause");
        acts.pause();
        break;
      case "paused":
        playSfx("select");
        acts.resume();
        break;
      case "cleared":
        acts.nextLevel();
        break;
      case "gameover":
        acts.restartLevel();
        break;
      case "victory":
        acts.restartRun();
        break;
      case "select":
        tryChoose(cursorRef.current);
        break;
    }
  };

  const handleSelectBtn = () => {
    const acts = actionsRef.current;
    if (modeRef.current === "select") {
      playSfx("menu");
      acts.closeSelect();
      return;
    }
    if (modeRef.current === "playing") {
      playSfx("pause");
      acts.pause();
    }
    acts.openSelect();
  };

  const level = LEVELS[levelIndex];
  const result = clearedResult ?? localResult;
  const finalLevel = levelIndex === LEVELS.length - 1;
  const selected = LEVELS[cursor];
  const chamberUnlocked = (i: number) => cleared.includes(i) || i <= unlockedThrough;

  return (
    <LinearGradient
      colors={["#EFE9D8", "#DDD6C2", "#CFC8B4"]}
      locations={[0, 0.46, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.shell, shadow.device]}
    >
      <View style={styles.topStrip}>
        <Pressable
          onPress={() => setPowered((p) => !p)}
          accessibilityRole="switch"
          accessibilityState={{ checked: powered }}
          accessibilityLabel={powered ? "Turn console off" : "Turn console on"}
          style={styles.powerRow}
        >
          <Text style={styles.powerLabel}>OFF</Text>
          <View style={styles.switchTrack}>
            <View style={[styles.switchThumb, powered ? styles.switchOn : styles.switchOff]} />
          </View>
          <Text style={styles.powerLabel}>ON</Text>
        </Pressable>
        <View style={styles.grooves}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.groove} />
          ))}
        </View>
        <Text style={styles.model}>PB-01</Text>
      </View>

      <View style={styles.bezel}>
        <View style={styles.bezelLabel}>
          <Text style={styles.bezelText} numberOfLines={1}>
            DOT MATRIX · STEREO
          </Text>
          <View style={styles.batteryRow}>
            <View style={[styles.led, powered && styles.ledOn]} />
            <Text style={styles.bezelText}>BATTERY</Text>
          </View>
        </View>

        <View style={styles.screenWell}>
          <View style={styles.hud}>
            <View style={styles.hudLeft}>
              {[0, 1, 2].map((i) => (
                <PixelIcon key={i} name="heart" size={11} color={i < hud.hearts ? colors.pale : "rgba(231,239,197,0.25)"} />
              ))}
              <View style={styles.hudGlyph}>
                <PixelIcon name="diamond" size={9} color={colors.screenMid} />
                <Text style={styles.hudText}>
                  {hud.glyphs}/{hud.total}
                </Text>
              </View>
            </View>
            <Text style={styles.hudText}>{hud.doorOpen && mode === "playing" ? "EXIT" : `CH.${pad2(levelIndex + 1)}`}</Text>
            <Text style={styles.hudText}>{String(hud.time).padStart(3, "0")}</Text>
          </View>

          <View style={[styles.playfield, { maxWidth: fieldMaxWidth, alignSelf: "center" }]}>
            <GameCanvas ref={canvasRef} />

            {powered && mode === "playing" && introVisible && (
              <View pointerEvents="none" style={styles.intro}>
                <View style={styles.introRow}>
                  <Text style={styles.introEyebrow}>CHAMBER {pad2(levelIndex + 1)} / 10</Text>
                  <Text style={styles.introEyebrow}>{hud.total} GLYPHS</Text>
                </View>
                <Text style={styles.introTitle} numberOfLines={1}>
                  {level.name.toUpperCase()}
                </Text>
                <Text style={styles.introHint} numberOfLines={2}>
                  {level.hint}
                </Text>
              </View>
            )}

            {powered && mode === "title" && (
              <Overlay tone="dark">
                <Text style={styles.kickerLight}>PIXEL BOY PRESENTS</Text>
                <PixelIcon name="lantern" size={22} color={colors.screenMid} />
                <Text style={styles.heroTitle}>GLYPH{"\n"}QUEST</Text>
                <Text style={styles.kickerLight}>CHAMBERS OF THE LOST LANTERN</Text>
                <View style={styles.btnCol}>
                  <ScreenButton label="PRESS START" solid onPress={session.startAdventure} />
                  <ScreenButton label="CHAMBER SELECT" onPress={session.openSelect} />
                </View>
                <View style={styles.titleFoot}>
                  <Text style={styles.tinyLight}>BEST {String(best).padStart(5, "0")}</Text>
                  <Pressable onPress={session.toggleSound} accessibilityLabel="Toggle sound">
                    <Text style={styles.tinyLight}>SOUND {soundOn ? "ON" : "OFF"}</Text>
                  </Pressable>
                </View>
              </Overlay>
            )}

            {powered && mode === "paused" && (
              <Overlay tone="light">
                <Text style={styles.kicker}>REST EASY, KEEPER</Text>
                <Text style={styles.heroTitleDark}>PAUSED</Text>
                <Text style={styles.bodyDark}>The lantern holds its breath. The crypt waits.</Text>
                <View style={styles.btnCol}>
                  <ScreenButton label="RESUME" solid onPress={() => { playSfx("select"); session.resume(); }} />
                  <View style={styles.btnRow}>
                    <ScreenButton label="RESTART" onPress={session.restartLevel} />
                    <ScreenButton label="QUIT" onPress={() => { playSfx("menu"); session.quitToTitle(); }} />
                  </View>
                </View>
              </Overlay>
            )}

            {powered && mode === "cleared" && (
              <Overlay tone="light">
                <Text style={styles.kicker}>{finalLevel ? "THE LANTERN LIVES" : `CHAMBER ${pad2(levelIndex + 1)} CLEARED`}</Text>
                <Text style={styles.heroTitleDark}>{finalLevel ? "ALL GLYPHS\nFOUND" : "GLYPH\nSECURED"}</Text>
                <Text style={styles.bodyDark} numberOfLines={1}>
                  {level.name} · the door remembers
                </Text>
                <View style={styles.statBox}>
                  <Stat label="TIME" value={formatTime(result?.time ?? 0)} />
                  <Stat label="GLYPHS" value={`${result?.glyphs ?? 0}/${result?.totalGlyphs ?? 0}`} />
                  <Stat label="HEARTS" value={`${result?.hearts ?? 0}/3`} />
                  <Stat label="SCORE" value={`+${result?.score ?? 0}`} strong />
                </View>
                <View style={styles.btnRow}>
                  <ScreenButton label={finalLevel ? "FINISH" : "NEXT"} solid onPress={session.nextLevel} />
                  <ScreenButton label="REPLAY" onPress={session.restartLevel} />
                  <ScreenButton label="MAP" onPress={() => session.setTab("chambers")} />
                </View>
              </Overlay>
            )}

            {powered && mode === "gameover" && (
              <Overlay tone="dark">
                <PixelIcon name="lantern" size={20} color={colors.screenMid} />
                <Text style={styles.kickerLight}>THE LANTERN DIMS</Text>
                <Text style={styles.heroTitle}>DARKNESS{"\n"}TAKES HOLD</Text>
                <Text style={styles.bodyLight}>Chamber {pad2(levelIndex + 1)} still waits. Dash through the danger.</Text>
                <View style={styles.btnRow}>
                  <ScreenButton label="TRY AGAIN" solid onPress={session.restartLevel} />
                  <ScreenButton label="MAP" ghost onPress={() => session.setTab("chambers")} />
                </View>
              </Overlay>
            )}

            {powered && mode === "victory" && (
              <Overlay tone="light">
                <Text style={styles.kicker}>THE TEN CHAMBERS ARE SILENT</Text>
                <Text style={styles.heroTitleDark}>THE LANTERN{"\n"}BURNS AGAIN</Text>
                <Text style={styles.bodyDark}>You carried every glyph home.</Text>
                <View style={styles.statBox}>
                  <Stat label="RUN" value={String(runScore).padStart(5, "0")} strong />
                  <Stat label="BEST" value={String(best).padStart(5, "0")} />
                </View>
                <View style={styles.btnRow}>
                  <ScreenButton label="NEW RUN" solid onPress={session.restartRun} />
                  <ScreenButton label="MAP" onPress={() => session.setTab("chambers")} />
                  <ScreenButton label="TITLE" onPress={() => { playSfx("menu"); session.quitToTitle(); }} />
                </View>
              </Overlay>
            )}

            {powered && mode === "select" && (
              <View style={styles.selectOverlay}>
                <View style={styles.introRow}>
                  <Text style={styles.selectTitle}>SELECT CHAMBER</Text>
                  <Text style={styles.selectMeta}>{cleared.length}/10</Text>
                </View>
                {[0, 1].map((row) => (
                  <View key={row} style={styles.selectRow}>
                    {LEVELS.slice(row * 5, row * 5 + 5).map((entry, offset) => {
                      const i = row * 5 + offset;
                      const open = chamberUnlocked(i);
                      const done = cleared.includes(i);
                      const active = cursor === i;
                      return (
                        <Pressable
                          key={entry.id}
                          onPress={() => {
                            setCursor(i);
                            if (open) session.playLevel(i);
                            else playSfx("menu");
                          }}
                          accessibilityLabel={`Chamber ${entry.id} ${entry.name}${done ? " cleared" : open ? "" : " locked"}`}
                          style={[styles.selectCell, active && styles.selectCellOn, !open && styles.selectCellLocked]}
                        >
                          <Text style={[styles.selectNum, active && styles.selectNumOn]}>{pad2(entry.id)}</Text>
                          <Text style={[styles.selectMark, active && styles.selectNumOn]}>{done ? "OK" : open ? "·" : "–"}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                <Text style={styles.selectName} numberOfLines={1}>
                  CH.{pad2(selected.id)} {selected.name.toUpperCase()}
                </Text>
                <Text style={styles.selectTag} numberOfLines={2}>
                  {chamberUnlocked(cursor) ? selected.tagline : "Sealed — clear the previous chamber"}
                </Text>
                <View style={styles.selectSpacer}>
                  <Text style={styles.selectHint}>D-PAD MOVES · A PLAYS</Text>
                </View>
                <View style={styles.selectActions}>
                  <ScreenButton label="PLAY" solid onPress={() => tryChoose(cursor)} />
                  <ScreenButton label="BACK" onPress={() => { playSfx("menu"); session.closeSelect(); }} />
                </View>
              </View>
            )}

            {!powered && (
              <View style={styles.offOverlay}>
                <Text style={styles.offText}>· OFF ·</Text>
                <Text style={styles.offSub}>SLIDE THE SWITCH TO PLAY</Text>
              </View>
            )}
          </View>

          <View style={styles.screenFoot}>
            <Text style={styles.screenFootText} numberOfLines={1}>
              {mode === "title" ? "INSERT CARTRIDGE" : `CH.${pad2(levelIndex + 1)} ${level.name.toUpperCase()}`}
            </Text>
            <Text style={styles.screenFootText}>A DASH · B HINT</Text>
          </View>
        </View>
      </View>

      <View style={styles.brandRow}>
        <Text style={styles.brand}>PIXEL BOY</Text>
        <Text style={styles.brandMeta}>MODEL PB-01{"\n"}REACT NATIVE</Text>
      </View>

      <View style={styles.controls}>
        <Dpad
          size={dpadSize}
          disabled={!powered}
          onDown={(dir) => {
            setDirection(dir, true);
            if (mode === "select") {
              const delta = dir === "up" ? -5 : dir === "down" ? 5 : dir === "left" ? -1 : 1;
              moveCursor(delta);
            }
          }}
          onUp={(dir) => setDirection(dir, false)}
        />
        <View style={styles.pills}>
          <View style={styles.pillRow}>
            <Pill label="SELECT" onPress={handleSelectBtn} disabled={!powered} />
            <Pill label="START" onPress={handleStart} disabled={!powered} />
          </View>
          <Text style={styles.pillCaption}>SELECT · START</Text>
        </View>
        <View style={[styles.abCluster, { width: dpadSize + 12, height: dpadSize }]}>
          <RoundButton label="A" onPress={handleA} disabled={!powered} style={styles.btnA} hint="confirm or dash" />
          <RoundButton label="B" onPress={handleB} disabled={!powered} style={styles.btnB} hint="back or hint" />
        </View>
      </View>

      <View style={styles.speakerRow}>
        <View style={styles.powerLedRow}>
          <View style={[styles.powerLed, powered && styles.powerLedOn]} />
          <Text style={styles.powerLedLabel}>POWER</Text>
        </View>
        <View style={styles.speakers}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.speaker} />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, strong && styles.statStrong]}>{value}</Text>
    </View>
  );
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Pill({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed, disabled && styles.disabled]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: "#E4DECC",
    borderRadius: 22,
    borderBottomRightRadius: 58,
    borderWidth: 2,
    borderColor: "#B7B09C",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  topStrip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingHorizontal: 4 },
  powerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  powerLabel: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1, color: "rgba(22,48,31,0.45)" },
  switchTrack: {
    width: 32,
    height: 14,
    borderRadius: 8,
    backgroundColor: "rgba(120,112,92,0.45)",
    borderWidth: 1,
    borderColor: "rgba(22,48,31,0.25)",
    justifyContent: "center",
  },
  switchThumb: { position: "absolute", top: 1, width: 12, height: 10, borderRadius: 6, backgroundColor: colors.ink },
  switchOn: { left: 16 },
  switchOff: { left: 2, opacity: 0.55 },
  grooves: { flexDirection: "row", gap: 4 },
  groove: { width: 14, height: 2, borderRadius: 2, backgroundColor: "rgba(22,48,31,0.18)" },
  model: { fontFamily: fonts.screen, fontSize: 8, color: "rgba(22,48,31,0.4)", letterSpacing: 1 },
  bezel: {
    backgroundColor: colors.bezel,
    borderRadius: 12,
    borderBottomRightRadius: 26,
    padding: 8,
  },
  bezelLabel: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingHorizontal: 2 },
  bezelText: { fontFamily: fonts.screen, fontSize: 7, color: colors.bezelText, letterSpacing: 0.4, flexShrink: 1 },
  batteryRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  led: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#6d705f" },
  ledOn: { backgroundColor: colors.coral, boxShadow: "0px 0px 6px " + colors.coral },
  screenWell: { borderRadius: 4, overflow: "hidden", borderWidth: 1, borderColor: "rgba(20,24,16,0.8)", backgroundColor: "#95a96a" },
  hud: {
    height: 26,
    backgroundColor: colors.screenInk,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  hudLeft: { flexDirection: "row", alignItems: "center", gap: 3 },
  hudGlyph: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 6 },
  hudText: { fontFamily: fonts.screen, fontSize: 9, color: colors.pale },
  playfield: { width: "100%", aspectRatio: 160 / 128, backgroundColor: colors.screen, position: "relative" },
  intro: {
    position: "absolute",
    left: "6%",
    right: "6%",
    bottom: 8,
    zIndex: 6,
    backgroundColor: "rgba(27,46,20,0.94)",
    borderWidth: 1,
    borderColor: "rgba(231,239,197,0.35)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  introRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  introEyebrow: { fontFamily: fonts.screen, fontSize: 8, color: colors.screenMid, letterSpacing: 0.6 },
  introTitle: { fontFamily: fonts.pixel, fontSize: 8, lineHeight: 14, color: colors.pale, marginTop: 2 },
  introHint: { fontFamily: fonts.screen, fontSize: 8, lineHeight: 12, color: "rgba(231,239,197,0.75)", marginTop: 2 },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  overlayDark: { backgroundColor: colors.screenInk },
  overlayLight: { backgroundColor: colors.screenLight },
  kicker: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1.2, color: colors.screenDark, textAlign: "center" },
  kickerLight: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1.2, color: colors.screenMid, textAlign: "center" },
  heroTitle: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 20, color: colors.pale, textAlign: "center" },
  heroTitleDark: { fontFamily: fonts.pixel, fontSize: 12, lineHeight: 18, color: colors.screenInk, textAlign: "center" },
  bodyDark: { fontFamily: fonts.screen, fontSize: 8, lineHeight: 12, color: "rgba(27,46,20,0.7)", textAlign: "center" },
  bodyLight: { fontFamily: fonts.screen, fontSize: 8, lineHeight: 12, color: "rgba(231,239,197,0.7)", textAlign: "center", maxWidth: 230 },
  tinyLight: { fontFamily: fonts.screen, fontSize: 7, color: "rgba(231,239,197,0.55)" },
  btnCol: { gap: 6, alignItems: "center", marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  screenBtn: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.screenInk,
    backgroundColor: colors.screenLight,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "2px 2px 0px " + colors.screenDark,
  },
  screenBtnSolid: { backgroundColor: colors.lime, borderColor: colors.screenInk },
  screenBtnGhost: { backgroundColor: "transparent", borderColor: "rgba(231,239,197,0.55)" },
  screenBtnPressed: { transform: [{ translateX: 1 }, { translateY: 1 }], boxShadow: "0px 0px 0px rgba(0,0,0,0)" },
  screenBtnText: { fontFamily: fonts.screen, fontSize: 9, color: colors.screenInk },
  screenBtnTextSolid: { color: colors.screenInk },
  screenBtnTextGhost: { color: colors.pale },
  titleFoot: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", marginTop: 2 },
  statBox: { alignSelf: "stretch", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(27,46,20,0.15)", paddingVertical: 4, gap: 2 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { fontFamily: fonts.screen, fontSize: 8, color: "rgba(27,46,20,0.55)" },
  statValue: { fontFamily: fonts.screen, fontSize: 8, color: colors.screenInk },
  statStrong: { fontFamily: fonts.pixel, fontSize: 8 },
  selectOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 8,
    backgroundColor: colors.screenLight,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  selectTitle: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1, color: colors.screenDark },
  selectMeta: { fontFamily: fonts.screen, fontSize: 8, color: colors.screenDark },
  selectRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  selectCell: {
    flex: 1,
    minHeight: 36,
    borderWidth: 2,
    borderColor: "rgba(27,46,20,0.28)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  selectCellOn: { backgroundColor: colors.screenInk, borderColor: colors.screenInk },
  selectCellLocked: { opacity: 0.45 },
  selectNum: { fontFamily: fonts.screen, fontSize: 10, color: colors.screenInk },
  selectNumOn: { color: colors.pale },
  selectMark: { fontFamily: fonts.screen, fontSize: 7, color: colors.screenDark },
  selectName: { fontFamily: fonts.screen, fontSize: 9, color: colors.screenInk, marginTop: 6 },
  selectTag: { fontFamily: fonts.screen, fontSize: 8, color: "rgba(27,46,20,0.6)", marginTop: 2 },
  selectSpacer: { flex: 1, alignItems: "center", justifyContent: "center" },
  selectHint: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 0.6, color: "rgba(27,46,20,0.4)" },
  selectActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  offOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 12,
    backgroundColor: "#454C39",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  offText: { fontFamily: fonts.screen, fontSize: 14, letterSpacing: 3, color: "rgba(184,189,159,0.7)" },
  offSub: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1, color: "rgba(184,189,159,0.55)" },
  screenFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: "#2C3028",
  },
  screenFootText: { fontFamily: fonts.screen, fontSize: 7, color: colors.bezelText, flexShrink: 1 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4 },
  brand: { fontFamily: fonts.screen, fontSize: 16, fontStyle: "italic", color: "rgba(22,48,31,0.82)" },
  brandMeta: { fontFamily: fonts.screen, fontSize: 7, lineHeight: 11, color: "rgba(22,48,31,0.4)", textAlign: "right" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 2 },
  pills: { alignItems: "center", gap: 4, transform: [{ rotate: "-16deg" }] },
  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    height: 16,
    minWidth: 42,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#6A6D60",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 2px 1px rgba(22,48,31,0.3)",
  },
  pillPressed: { transform: [{ translateY: 1 }] },
  pillText: { fontFamily: fonts.screen, fontSize: 6, color: "#2B2E26", letterSpacing: 0.4 },
  pillCaption: { fontFamily: fonts.screen, fontSize: 6, color: "rgba(22,48,31,0.35)", letterSpacing: 0.5 },
  abCluster: { position: "relative" },
  btnA: { top: 0, right: 0 },
  btnB: { bottom: 0, left: 0 },
  disabled: { opacity: 0.55 },
  speakerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 8, marginTop: 8 },
  powerLedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  powerLed: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C4BEAC" },
  powerLedOn: { backgroundColor: colors.coral, boxShadow: "0px 0px 6px " + colors.coral },
  powerLedLabel: { fontFamily: fonts.screen, fontSize: 7, letterSpacing: 1.4, color: "rgba(22,48,31,0.4)" },
  speakers: { flexDirection: "row", gap: 5, alignItems: "center" },
  speaker: { width: 5, height: 22, borderRadius: 4, backgroundColor: "#A39D8B", transform: [{ rotate: "28deg" }] },
});
