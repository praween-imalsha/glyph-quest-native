import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

/**
 * The web build synthesised its beeps with WebAudio oscillators. React Native has
 * no WebAudio, so the same square / saw / triangle arpeggios were rendered once
 * to short WAV files (assets/sfx, see scripts/generate-sfx.py) and are played
 * back with expo-audio.
 */
const SOURCES = {
  menu: require("../../assets/sfx/menu.wav"),
  select: require("../../assets/sfx/select.wav"),
  start: require("../../assets/sfx/start.wav"),
  glyph: require("../../assets/sfx/glyph.wav"),
  door: require("../../assets/sfx/door.wav"),
  clear: require("../../assets/sfx/clear.wav"),
  hurt: require("../../assets/sfx/hurt.wav"),
  dead: require("../../assets/sfx/dead.wav"),
  dash: require("../../assets/sfx/dash.wav"),
  hint: require("../../assets/sfx/hint.wav"),
  pause: require("../../assets/sfx/pause.wav"),
  victory: require("../../assets/sfx/victory.wav"),
} as const;

export type SfxName = keyof typeof SOURCES;

const players = new Map<SfxName, AudioPlayer>();
let enabled = true;
let ready = false;

export function initAudio() {
  if (ready) return;
  ready = true;
  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(() => {});
  (Object.keys(SOURCES) as SfxName[]).forEach((name) => {
    try {
      players.set(name, createAudioPlayer(SOURCES[name]));
    } catch {
      /* a missing player only silences that one effect */
    }
  });
}

export function setSfxEnabled(value: boolean) {
  enabled = value;
}

export function playSfx(name: SfxName) {
  if (!enabled) return;
  const player = players.get(name);
  if (!player) return;
  try {
    void player.seekTo(0);
    player.play();
  } catch {
    /* ignore — audio must never crash the game loop */
  }
}

/** Short vibration pulses for the moments that matter. Follows the same on/off switch as sound. */
export function buzz(kind: "light" | "heavy" | "success") {
  if (!enabled) return;
  try {
    if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.impactAsync(kind === "heavy" ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* ignore */
  }
}
