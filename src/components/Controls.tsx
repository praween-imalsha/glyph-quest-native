import { useEffect, useRef, useState, type ComponentRef } from "react";
import { StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../ui";
import { fonts } from "../theme";

export type Dir = "up" | "down" | "left" | "right";
const DIRS: Dir[] = ["up", "down", "left", "right"];
const none = (): Record<Dir, boolean> => ({ up: false, down: false, left: false, right: false });

/**
 * Touch D-pad.
 *
 * Pressable only lets one finger own the responder, which would make "hold the
 * D-pad and tap A" impossible. This reads raw touch events instead, so any number
 * of fingers can be down at once. A finger sliding across the pad changes direction
 * and diagonals work (the engine already normalises diagonal speed).
 */
export function Dpad({
  size,
  disabled,
  onDown,
  onUp,
}: {
  size: number;
  disabled: boolean;
  onDown: (dir: Dir) => void;
  onUp: (dir: Dir) => void;
}) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const rect = useRef({ x: 0, y: 0, w: size, h: size });
  const held = useRef(none());
  const [shown, setShown] = useState(none());
  const callbacks = useRef({ onDown, onUp });
  callbacks.current = { onDown, onUp };

  const apply = (next: Record<Dir, boolean>) => {
    let changed = false;
    for (const dir of DIRS) {
      if (next[dir] === held.current[dir]) continue;
      held.current[dir] = next[dir];
      changed = true;
      if (next[dir]) callbacks.current.onDown(dir);
      else callbacks.current.onUp(dir);
    }
    if (changed) setShown({ ...held.current });
  };

  const read = (event: GestureResponderEvent) => {
    const next = none();
    const r = rect.current;
    const reach = 22; // let a thumb drift slightly off the pad without letting go
    for (const touch of event.nativeEvent.touches) {
      const dx = touch.pageX - (r.x + r.w / 2);
      const dy = touch.pageY - (r.y + r.h / 2);
      if (Math.abs(dx) > r.w / 2 + reach || Math.abs(dy) > r.h / 2 + reach) continue;
      const dead = r.w * 0.12;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax > dead && ax >= ay * 0.45) next[dx < 0 ? "left" : "right"] = true;
      if (ay > dead && ay >= ax * 0.45) next[dy < 0 ? "up" : "down"] = true;
      break;
    }
    apply(next);
  };

  useEffect(() => {
    if (disabled) apply(none());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const armW = Math.round(size * 0.34);
  const armH = Math.round(size * 0.36);

  return (
    <View
      ref={box}
      style={{ width: size, height: size }}
      accessibilityLabel="Directional pad"
      onTouchStart={(event) => {
        if (disabled) return;
        box.current?.measure((_x, _y, w, h, pageX, pageY) => {
          rect.current = { x: pageX, y: pageY, w, h };
          read(event);
        });
      }}
      onTouchMove={(event) => {
        if (!disabled) read(event);
      }}
      onTouchEnd={read}
      onTouchCancel={read}
    >
      {DIRS.map((dir) => (
        <View
          key={dir}
          pointerEvents="none"
          style={[
            styles.dpadArm,
            {
              width: dir === "left" || dir === "right" ? armH : armW,
              height: dir === "left" || dir === "right" ? armW : armH,
            },
            dir === "up" && { top: 0, left: (size - armW) / 2, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
            dir === "down" && { bottom: 0, left: (size - armW) / 2, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
            dir === "left" && { left: 0, top: (size - armW) / 2, borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
            dir === "right" && { right: 0, top: (size - armW) / 2, borderTopRightRadius: 7, borderBottomRightRadius: 7 },
            shown[dir] && styles.dpadPressed,
          ]}
        >
          <Text style={styles.dpadGlyph}>{dir === "up" ? "▲" : dir === "down" ? "▼" : dir === "left" ? "◀" : "▶"}</Text>
        </View>
      ))}
      <View
        pointerEvents="none"
        style={[styles.dpadHub, { width: armW - 2, height: armW - 2, left: (size - armW + 2) / 2, top: (size - armW + 2) / 2 }]}
      />
    </View>
  );
}

/** Round A / B button. Fires on touch-down for snappy dashes, and works independently of other fingers. */
export function RoundButton({
  label,
  onPress,
  disabled,
  style,
  hint,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  style: StyleProp<ViewStyle>;
  hint: string;
}) {
  const [down, setDown] = useState(false);
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label} button — ${hint}`}
      accessibilityState={{ disabled }}
      onAccessibilityTap={disabled ? undefined : onPress}
      onTouchStart={() => {
        if (disabled) return;
        setDown(true);
        onPress();
      }}
      onTouchEnd={() => setDown(false)}
      onTouchCancel={() => setDown(false)}
      style={[styles.ab, style, down && styles.abPressed, disabled && styles.disabled]}
    >
      <View pointerEvents="none" style={styles.abShine} />
      <Text style={styles.abText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dpadArm: {
    position: "absolute",
    backgroundColor: "#2A2D27",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 3px 1px rgba(22,48,31,0.35)",
  },
  dpadPressed: { backgroundColor: "#14160F", boxShadow: "0px 0px 0px rgba(0,0,0,0)" },
  dpadGlyph: { color: "#E7EFD0", fontSize: 13, lineHeight: 16 },
  dpadHub: { position: "absolute", borderRadius: 4, backgroundColor: "#2F322B", borderWidth: 1, borderColor: "rgba(0,0,0,0.25)" },
  ab: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#D8573E",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 2px rgba(22,48,31,0.35)",
  },
  abPressed: { transform: [{ translateY: 2 }], backgroundColor: "#C44C35", boxShadow: "0px 1px 1px rgba(22,48,31,0.35)" },
  abShine: { position: "absolute", top: 6, left: 8, width: 12, height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)" },
  abText: { fontFamily: fonts.screen, fontSize: 16, color: "#F8E8E2" },
  disabled: { opacity: 0.55 },
});
