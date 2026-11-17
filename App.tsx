import { useEffect, useRef, type ComponentRef } from "react";
import { AppState, BackHandler, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useFonts } from "expo-font";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono/400Regular";
import { DMMono_400Regular_Italic } from "@expo-google-fonts/dm-mono/400Regular_Italic";
import { PressStart2P_400Regular } from "@expo-google-fonts/press-start-2p/400Regular";
import { Silkscreen_400Regular } from "@expo-google-fonts/silkscreen/400Regular";
import { Silkscreen_700Bold } from "@expo-google-fonts/silkscreen/700Bold";
import { SessionProvider, useSession, type TabId } from "./src/game/session";
import { playSfx } from "./src/game/audio";
import { Text } from "./src/ui";
import { colors, fonts, shadow } from "./src/theme";
import { PixelIcon, type IconName } from "./src/components/PixelIcon";
import { ChambersBody, GuideBody, PlayBody } from "./src/screens/Bodies";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "play", label: "Play", icon: "play" },
  { id: "chambers", label: "Chambers", icon: "map" },
  { id: "guide", label: "Guide", icon: "book" },
];

function Shell() {
  const session = useSession();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 980;
  const playing = session.mode === "playing";

  const playScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Hold the splash screen until the saved game has been read.
  useEffect(() => {
    if (session.ready) void SplashScreen.hideAsync().catch(() => {});
  }, [session.ready]);

  // Keep the screen awake during play, and bring the controls back into view when a run starts.
  useEffect(() => {
    if (!playing) return;
    void activateKeepAwakeAsync("glyphquest-play").catch(() => {});
    playScroll.current?.scrollTo({ y: 0, animated: false });
    return () => {
      void deactivateKeepAwake("glyphquest-play").catch(() => {});
    };
  }, [playing]);

  // Leaving the app mid-run pauses it.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && sessionRef.current.mode === "playing") {
        playSfx("pause");
        sessionRef.current.pause();
      }
    });
    return () => sub.remove();
  }, []);

  // Android hardware / gesture Back: step out of the current screen, exit only from the title.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const s = sessionRef.current;
      if (s.confirmReset) {
        s.cancelReset();
        return true;
      }
      if (s.tab !== "play") {
        s.setTab("play");
        return true;
      }
      switch (s.mode) {
        case "playing":
          playSfx("pause");
          s.pause();
          return true;
        case "select":
          s.closeSelect();
          return true;
        case "paused":
        case "cleared":
        case "gameover":
        case "victory":
          playSfx("menu");
          s.quitToTitle();
          return true;
        default:
          return false;
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={styles.mark}>
          <PixelIcon name="diamond" size={16} color={colors.forest} />
          <View style={styles.markDot} />
        </View>
        <View style={styles.brandBlock}>
          <Text style={styles.brand} numberOfLines={1}>
            GLYPH QUEST
          </Text>
          <Text style={styles.brandSub} numberOfLines={1}>
            {width < 360 ? "REACT NATIVE" : "REACT NATIVE · 10 CHAMBERS"}
          </Text>
        </View>
        <View style={styles.headerTools}>
          <View style={styles.countChip}>
            <PixelIcon name="diamond" size={9} color={colors.forest} />
            <Text style={styles.countText}>{session.cleared.length}/10</Text>
          </View>
          <Pressable
            onPress={session.toggleSound}
            accessibilityRole="button"
            accessibilityLabel={session.soundOn ? "Mute sound" : "Enable sound"}
            style={({ pressed }) => [styles.soundBtn, pressed && styles.pressed]}
          >
            <Text style={styles.soundText}>{session.soundOn ? "SFX" : "OFF"}</Text>
          </Pressable>
        </View>
      </View>

      {wide ? (
        <View style={styles.split}>
          <ScrollView style={styles.splitPlay} contentContainerStyle={styles.pad} scrollEnabled={!playing} keyboardShouldPersistTaps="handled">
            <PlayBody />
          </ScrollView>
          <ScrollView style={styles.splitSide} contentContainerStyle={styles.padSide} keyboardShouldPersistTaps="handled">
            <ChambersBody />
            <GuideBody />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.stage}>
          <ScrollView
            ref={playScroll}
            style={[styles.page, session.tab !== "play" && styles.hidden]}
            contentContainerStyle={styles.pad}
            scrollEnabled={!playing}
            keyboardShouldPersistTaps="handled"
          >
            <PlayBody />
          </ScrollView>
          {session.tab === "chambers" && (
            <ScrollView style={styles.page} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              <ChambersBody />
            </ScrollView>
          )}
          {session.tab === "guide" && (
            <ScrollView style={styles.page} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              <GuideBody />
            </ScrollView>
          )}
        </View>
      )}

      {!wide && (
        <View style={[styles.tabBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
          {TABS.map((tab) => {
            const active = session.tab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => session.setTab(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={styles.tab}
              >
                <View style={[styles.tabIcon, active && styles.tabIconOn]}>
                  <PixelIcon name={tab.icon} size={14} color={active ? colors.ink : colors.inkFaint} />
                </View>
                <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{tab.label}</Text>
                {active && <View style={styles.tabPulse} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {session.notice && !wide && session.tab !== "chambers" && (
        <View style={[styles.toast, { bottom: 84 + insets.bottom }]} pointerEvents="none">
          <Text style={styles.toastText}>{session.notice}</Text>
        </View>
      )}

      <Modal visible={session.confirmReset} transparent animationType="fade" onRequestClose={session.cancelReset}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, shadow.card]}>
            <Text style={styles.modalKicker}>CARTRIDGE MEMORY</Text>
            <Text style={styles.modalTitle}>Erase the save?</Text>
            <Text style={styles.modalBody}>Chamber progress, best score, and best times will be wiped. The lantern goes dark again.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={session.cancelReset} style={({ pressed }) => [styles.modalKeep, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.modalKeepText}>KEEP SAVE</Text>
              </Pressable>
              <Pressable onPress={session.confirmResetSave} style={({ pressed }) => [styles.modalErase, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.modalEraseText}>ERASE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.pixel]: PressStart2P_400Regular,
    [fonts.screen]: Silkscreen_400Regular,
    [fonts.screenBold]: Silkscreen_700Bold,
    [fonts.mono]: DMMono_400Regular,
    [fonts.monoItalic]: DMMono_400Regular_Italic,
  });

  // Fonts ship inside the app, so this resolves in a blink. If one ever fails, fall back to system fonts.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(22,48,31,0.1)",
    backgroundColor: "rgba(230,224,206,0.92)",
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "3px 3px 0px " + colors.ink,
  },
  markDot: { position: "absolute", top: -3, right: -3, width: 8, height: 8, backgroundColor: colors.coral, borderWidth: 1, borderColor: colors.ink },
  brandBlock: { flex: 1, minWidth: 0 },
  brand: { fontFamily: fonts.pixel, fontSize: 11, color: colors.ink },
  brandSub: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 0.8, color: colors.inkFaint, marginTop: 3 },
  headerTools: { flexDirection: "row", alignItems: "center", gap: 8 },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(22,48,31,0.14)",
    backgroundColor: colors.cream,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 32,
  },
  countText: { fontFamily: fonts.screen, fontSize: 10, color: colors.inkSoft },
  soundBtn: {
    minWidth: 40,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  soundText: { fontFamily: fonts.screen, fontSize: 9, color: colors.ink },
  pressed: { transform: [{ translateY: 1 }] },
  split: { flex: 1, flexDirection: "row" },
  splitPlay: { width: 460, maxWidth: "46%", borderRightWidth: 1, borderRightColor: "rgba(22,48,31,0.08)" },
  splitSide: { flex: 1 },
  stage: { flex: 1, minHeight: 0, overflow: "hidden" },
  page: { flex: 1, minHeight: 0 },
  hidden: { display: "none" },
  pad: { padding: 16, paddingBottom: 28, gap: 0 },
  padSide: { padding: 20, paddingBottom: 40, gap: 18 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(22,48,31,0.12)",
    backgroundColor: colors.cream,
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 52, gap: 3 },
  tabIcon: { width: 36, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tabIconOn: { backgroundColor: colors.lime },
  tabLabel: { fontFamily: fonts.screen, fontSize: 9, color: colors.inkFaint },
  tabLabelOn: { color: colors.ink },
  tabPulse: { position: "absolute", top: 0, width: 18, height: 3, borderRadius: 2, backgroundColor: colors.coral },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 84,
    backgroundColor: colors.forest,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 20,
  },
  toastText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, color: colors.lime },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(22,48,31,0.46)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: colors.cream, borderRadius: 16, borderWidth: 1.5, borderColor: colors.ink, padding: 18, gap: 8 },
  modalKicker: { fontFamily: fonts.screen, fontSize: 8, letterSpacing: 1.2, color: colors.inkFaint },
  modalTitle: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 20, color: colors.ink },
  modalBody: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  modalKeep: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.paper },
  modalKeepText: { fontFamily: fonts.screen, fontSize: 10, color: colors.ink },
  modalErase: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.coral, borderWidth: 1.5, borderColor: colors.ink },
  modalEraseText: { fontFamily: fonts.screen, fontSize: 10, color: colors.white },
});
