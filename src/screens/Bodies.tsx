import { Pressable, StyleSheet, View } from "react-native";
import { LEVELS, parseLevel } from "../game/levels";
import { useSession, type ScreenMode } from "../game/session";
import { Text } from "../ui";
import { colors, fonts, hardShadow, shadow } from "../theme";
import { PixelIcon, type IconName } from "../components/PixelIcon";
import { MiniMap } from "../components/MiniMap";
import Console from "../components/Console";

const pad2 = (n: number) => String(n).padStart(2, "0");

const modeLabel: Record<ScreenMode, string> = {
  title: "READY",
  playing: "IN PLAY",
  paused: "PAUSED",
  cleared: "CLEARED",
  gameover: "DARKNESS",
  victory: "COMPLETE",
  select: "MAPPING",
};

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PlayBody() {
  const session = useSession();
  const level = LEVELS[session.levelIndex];
  const primary = primaryAction(session.mode, session.levelIndex, session);

  return (
    <View style={styles.stack}>
      <View style={styles.kickerRow}>
        <View style={[styles.liveDot, session.mode === "playing" && styles.liveDotOn]} />
        <Text style={styles.kicker}>{session.mode === "title" ? "CARTRIDGE INSERTED" : "REACT NATIVE RUNTIME"}</Text>
        <Text style={styles.kickerRight}>SIDE A · 60 HZ</Text>
      </View>
      <Console />
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.eyebrow}>{session.mode === "title" ? "YOUR JOURNEY BEGINS" : "CURRENT CHAMBER"}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              CH.{pad2(level.id)} · {level.name.toUpperCase()}
            </Text>
            <Text style={styles.cardQuote} numberOfLines={2}>
              “{level.tagline}”
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{modeLabel[session.mode]}</Text>
          </View>
        </View>
        <Text style={styles.hint}>{level.hint}</Text>
        <View style={styles.actionRow}>
          <Pressable onPress={primary.onPress} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.primaryText}>{primary.label}</Text>
            <PixelIcon name="play" size={10} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => session.setTab("chambers")}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>CHAMBER MAP</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.keyRow}>
        <Key label="D-PAD" note="move" />
        <Key label="A" note="dash" />
        <Key label="B" note="hint" />
        <Key label="START" note="pause" />
      </View>
    </View>
  );
}

function primaryAction(
  mode: ScreenMode,
  levelIndex: number,
  session: ReturnType<typeof useSession>,
): { label: string; onPress: () => void } {
  switch (mode) {
    case "title":
      return { label: "START ADVENTURE", onPress: session.startAdventure };
    case "playing":
      return { label: "PAUSE GAME", onPress: () => { session.pause(); } };
    case "paused":
      return { label: "RESUME CHAMBER", onPress: () => { session.resume(); } };
    case "cleared":
      return { label: levelIndex === LEVELS.length - 1 ? "SEE THE ENDING" : "NEXT CHAMBER", onPress: session.nextLevel };
    case "gameover":
      return { label: "RETRY CHAMBER", onPress: session.restartLevel };
    case "victory":
      return { label: "PLAY AGAIN", onPress: session.restartRun };
    case "select":
      return { label: "BACK TO TITLE", onPress: session.closeSelect };
    default:
      return { label: "START ADVENTURE", onPress: session.startAdventure };
  }
}

export function ChambersBody() {
  const session = useSession();
  const recovered = session.cleared.length;
  const allOpen = session.isUnlocked(LEVELS.length - 1);

  return (
    <View style={styles.stack}>
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>THE LANTERN</Text>
            <Text style={styles.cardTitle}>{recovered}/10 GLYPHS RECOVERED</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.eyebrow}>BEST</Text>
            <Text style={styles.score}>{String(session.best).padStart(5, "0")}</Text>
          </View>
        </View>
        <View style={styles.rail}>
          {LEVELS.map((level, i) => (
            <View
              key={level.id}
              style={[
                styles.railSeg,
                session.cleared.includes(i) && styles.railDone,
                i === session.levelIndex && session.mode !== "title" && !session.cleared.includes(i) && styles.railNow,
              ]}
            />
          ))}
        </View>
        <View style={styles.metrics}>
          <Metric label="RUN SCORE" value={String(session.runScore).padStart(5, "0")} />
          <Metric label="HEARTS" value="03" />
          <Metric label="CHAMBER" value={pad2(session.levelIndex + 1)} />
        </View>
      </View>

      <View style={styles.sectionHead}>
        <PixelIcon name="map" size={12} color={colors.forest} />
        <Text style={styles.sectionTitle}>CHAMBER LOG</Text>
        <Text style={styles.sectionMeta}>{recovered} of 10 cleared</Text>
      </View>

      {LEVELS.map((level, i) => (
        <ChamberRow key={level.id} index={i} />
      ))}

      {session.notice && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{session.notice}</Text>
        </View>
      )}

      <Text style={styles.note}>{allOpen ? "Every chamber is open. Good luck, keeper." : "Clear a chamber to unseal the next."}</Text>
      <View style={styles.actionRow}>
        {!allOpen && (
          <Pressable onPress={session.unlockEveryChamber} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.secondaryText}>UNSEAL ALL</Text>
          </Pressable>
        )}
        <Pressable onPress={session.askReset} style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.dangerText}>RESET SAVE</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChamberRow({ index }: { index: number }) {
  const session = useSession();
  const level = LEVELS[index];
  const parsed = parseLevel(level);
  const open = session.isUnlocked(index);
  const done = session.cleared.includes(index);
  const active = index === session.levelIndex && session.mode !== "title";
  const best = session.times[String(index)];
  const danger = Math.min(5, Math.max(1, Math.ceil(level.id * 0.55)));

  return (
    <Pressable
      onPress={() => session.playLevel(index)}
      accessibilityRole="button"
      accessibilityLabel={`Chamber ${level.id}, ${level.name}${done ? ", cleared" : open ? "" : ", sealed"}`}
      style={({ pressed }) => [styles.chamber, active && styles.chamberActive, !open && styles.chamberLocked, pressed && styles.pressed]}
    >
      <View style={[styles.num, done && styles.numDone, active && styles.numActive]}>
        {done ? <PixelIcon name="check" size={12} color={colors.lime} /> : <Text style={[styles.numText, done && { color: colors.lime }]}>{pad2(level.id)}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.chamberName} numberOfLines={1}>
          {level.name}
        </Text>
        <Text style={styles.chamberTag} numberOfLines={1}>
          {open ? level.tagline : "Sealed · clear the previous chamber"}
        </Text>
        <View style={styles.metaRow}>
          {open ? (
            <>
              <PixelIcon name="diamond" size={8} color={colors.moss} />
              <Text style={styles.metaText}>{parsed.glyphs.length}</Text>
              <View style={styles.dots}>
                {Array.from({ length: 5 }, (_, d) => (
                  <View key={d} style={[styles.dot, d < danger && styles.dotOn]} />
                ))}
              </View>
              {best !== undefined && <Text style={styles.metaText}>best {formatTime(best)}</Text>}
            </>
          ) : (
            <PixelIcon name="lock" size={9} color={colors.inkFaint} />
          )}
        </View>
      </View>
      <MiniMap index={index} muted={!open} />
    </Pressable>
  );
}

export function GuideBody() {
  return (
    <View style={styles.stack}>
      <View style={[styles.card, shadow.card]}>
        <Text style={styles.eyebrow}>THE STORY</Text>
        <Text style={styles.storyTitle}>The lantern shattered into ten glyphs.</Text>
        <Text style={styles.story}>
          You are the last keeper. Comb candle-lit chambers, gather every diamond, and carry the light home. Slimes
          patrol the halls. Bats stir in the dark. Stone doors do not open for the empty-handed.
        </Text>
        <View style={styles.storyStats}>
          <Metric label="CHAMBERS" value="10" />
          <Metric label="GLYPHS" value="37" />
          <Metric label="HEARTS" value="03" />
        </View>
      </View>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.eyebrow}>FIELD MANUAL</Text>
        <Text style={styles.cardTitle}>HOW TO PLAY</Text>
        {MANUAL.map((row) => (
          <View key={row.label} style={styles.manualRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.manualLabel}>{row.label}</Text>
              <Text style={styles.manualNote} numberOfLines={2}>
                {row.note}
              </Text>
            </View>
            <View style={styles.keys}>
              {row.keys.map((key) => (
                <View key={key} style={styles.keycap}>
                  <Text style={styles.keycapText}>{key}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.tip}>
        <PixelIcon name="spark" size={12} color={colors.coral} />
        <Text style={styles.tipText}>
          Collect every diamond to unseal the exit. A dash makes you briefly untouchable — slip through a slime, not into a wall.
        </Text>
      </View>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.eyebrow}>RUNTIME</Text>
        <Text style={styles.cardTitle}>BUILT WITH REACT NATIVE</Text>
        <Text style={styles.story}>
          Every screen is View, Text, Pressable, and ScrollView. The handheld, chamber log, and this guide share one
          session. On a phone the tabs switch scenes. On a wide display the console stays beside the log. Progress is
          written to cartridge memory on this device.
        </Text>
        <View style={styles.runtimeRow}>
          <RuntimeChip icon="play" label="Play" />
          <RuntimeChip icon="map" label="Chambers" />
          <RuntimeChip icon="book" label="Guide" />
        </View>
      </View>
    </View>
  );
}

function RuntimeChip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.runtimeChip}>
      <PixelIcon name={icon} size={10} color={colors.forest} />
      <Text style={styles.runtimeText}>{label}</Text>
    </View>
  );
}

function Key({ label, note }: { label: string; note: string }) {
  return (
    <View style={styles.keyChip}>
      <Text style={styles.keyChipLabel}>{label}</Text>
      <Text style={styles.keyChipNote}>{note}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const MANUAL = [
  { label: "MOVE", note: "Hold the D-pad. Slide to turn.", keys: ["D-PAD"] },
  { label: "DASH", note: "Short burst. Briefly safe.", keys: ["A"] },
  { label: "HINT", note: "Marks glyphs and the door.", keys: ["B"] },
  { label: "PAUSE", note: "Tap START, or use Back.", keys: ["START"] },
  { label: "RESTART", note: "Pause, then tap RESTART.", keys: ["START"] },
  { label: "MUTE", note: "All 4-bit beeps and buzzes.", keys: ["SFX"] },
];

const styles = StyleSheet.create({
  stack: { gap: 14 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.moss },
  liveDotOn: { backgroundColor: colors.coral },
  kicker: { flex: 1, fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1, color: colors.inkFaint },
  kickerRight: { fontFamily: fonts.mono, fontSize: 10, color: colors.inkFaint },
  card: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(22,48,31,0.14)",
    padding: 14,
    gap: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eyebrow: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1.1, color: colors.inkFaint },
  cardTitle: { fontFamily: fonts.screen, fontSize: 13, color: colors.ink, marginTop: 3 },
  cardQuote: { fontFamily: fonts.monoItalic, fontSize: 12, color: colors.inkSoft, marginTop: 3 },
  hint: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  badge: { borderWidth: 1, borderColor: "rgba(22,48,31,0.18)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: colors.paperDeep },
  badgeText: { fontFamily: fonts.screen, fontSize: 8, color: colors.inkSoft, letterSpacing: 0.6 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.lime,
    borderWidth: 1.5,
    borderColor: colors.ink,
    paddingHorizontal: 14,
    minHeight: 44,
    boxShadow: hardShadow(3),
  },
  primaryText: { fontFamily: fonts.screen, fontSize: 11, color: colors.ink },
  secondary: {
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.cream,
    boxShadow: hardShadow(3),
  },
  secondaryText: { fontFamily: fonts.screen, fontSize: 10, color: colors.ink },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: hardShadow(1) },
  keyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  keyChip: { borderWidth: 1, borderColor: "rgba(22,48,31,0.12)", backgroundColor: "rgba(247,242,230,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 72 },
  keyChipLabel: { fontFamily: fonts.screen, fontSize: 8, color: colors.ink },
  keyChipNote: { fontFamily: fonts.mono, fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  rail: { flexDirection: "row", gap: 3, marginTop: 4 },
  railSeg: { flex: 1, height: 8, borderRadius: 2, backgroundColor: "rgba(22,48,31,0.12)" },
  railDone: { backgroundColor: colors.forest },
  railNow: { backgroundColor: colors.coral },
  metrics: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(22,48,31,0.08)", paddingTop: 10, marginTop: 4 },
  metric: { flex: 1, gap: 3 },
  metricValue: { fontFamily: fonts.screen, fontSize: 14, color: colors.forest },
  score: { fontFamily: fonts.screen, fontSize: 14, color: colors.forest, marginTop: 3 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  sectionTitle: { flex: 1, fontFamily: fonts.screen, fontSize: 12, letterSpacing: 1, color: colors.ink },
  sectionMeta: { fontFamily: fonts.mono, fontSize: 11, color: colors.inkFaint },
  chamber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(22,48,31,0.12)",
    padding: 10,
    minHeight: 78,
  },
  chamberActive: { borderColor: colors.forest, backgroundColor: "#F3F6DE" },
  chamberLocked: { opacity: 0.72 },
  num: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: "rgba(22,48,31,0.18)", alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  numDone: { backgroundColor: colors.forest, borderColor: colors.forest },
  numActive: { borderColor: colors.forest },
  numText: { fontFamily: fonts.screen, fontSize: 11, color: colors.ink },
  chamberName: { fontFamily: fonts.screen, fontSize: 12, color: colors.ink },
  chamberTag: { fontFamily: fonts.mono, fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  metaText: { fontFamily: fonts.mono, fontSize: 10, color: colors.inkSoft },
  dots: { flexDirection: "row", gap: 2, marginLeft: 2 },
  dot: { width: 5, height: 5, borderRadius: 1, backgroundColor: "rgba(22,48,31,0.12)" },
  dotOn: { backgroundColor: colors.coral },
  map: { width: 54, height: 44, borderRadius: 4, overflow: "hidden", borderWidth: 1, borderColor: "rgba(22,48,31,0.16)", backgroundColor: colors.paperDeep },
  notice: { backgroundColor: "rgba(216,87,62,0.12)", borderWidth: 1, borderColor: "rgba(216,87,62,0.35)", borderRadius: 8, padding: 10 },
  noticeText: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 17, color: colors.danger },
  note: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint },
  dangerBtn: { minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  dangerText: { fontFamily: fonts.screen, fontSize: 10, color: colors.coralDeep, textDecorationLine: "underline" },
  storyTitle: { fontFamily: fonts.pixel, fontSize: 12, lineHeight: 20, color: colors.ink },
  story: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: colors.inkSoft },
  storyStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(22,48,31,0.08)", paddingTop: 10 },
  manualRow: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: "rgba(22,48,31,0.08)", paddingVertical: 8 },
  manualLabel: { fontFamily: fonts.screen, fontSize: 10, color: colors.ink },
  manualNote: { fontFamily: fonts.mono, fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  keys: { flexDirection: "row", gap: 4, flexShrink: 0 },
  keycap: { minWidth: 28, height: 24, paddingHorizontal: 6, borderRadius: 4, borderWidth: 1, borderColor: "rgba(22,48,31,0.25)", backgroundColor: colors.paperDeep, alignItems: "center", justifyContent: "center" },
  keycapText: { fontFamily: fonts.screen, fontSize: 8, color: colors.inkSoft },
  tip: { flexDirection: "row", gap: 8, backgroundColor: "rgba(216,87,62,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(216,87,62,0.18)" },
  tipText: { flex: 1, fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  runtimeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  runtimeChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(22,48,31,0.14)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.paper },
  runtimeText: { fontFamily: fonts.screen, fontSize: 9, color: colors.forest },
});
