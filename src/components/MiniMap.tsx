import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, Group, Picture, createPicture } from "@shopify/react-native-skia";
import { LEVELS, COLS, ROWS, TILE, parseLevel } from "../game/levels";
import { Gfx } from "../game/gfx";
import { colors } from "../theme";

const BOX_W = 52;
const BOX_H = 42;

/** One pixel per tile: walls, glyphs, and the exit door. */
export function MiniMap({ index, muted }: { index: number; muted: boolean }) {
  const picture = useMemo(
    () =>
      createPicture(
        (canvas) => {
          const g = new Gfx(canvas);
          const parsed = parseLevel(LEVELS[index]);
          g.fillStyle = muted ? "#e4decc" : "#f4efe2";
          g.fillRect(0, 0, COLS, ROWS);
          g.fillStyle = muted ? "#b7b09c" : "#1d3b28";
          parsed.walls.forEach((row, y) => row.forEach((solid, x) => solid && g.fillRect(x, y, 1, 1)));
          g.fillStyle = "#7e9a52";
          parsed.glyphs.forEach((p) => g.fillRect(Math.floor(p.x / TILE), Math.floor(p.y / TILE), 1, 1));
          g.fillStyle = "#d8573e";
          g.fillRect(Math.floor(parsed.door.x / TILE), Math.floor(parsed.door.y / TILE), 1, 1);
        },
        { width: COLS, height: ROWS },
      ),
    [index, muted],
  );

  return (
    <View style={[styles.map, muted && { opacity: 0.6 }]} pointerEvents="none">
      <Canvas style={{ width: BOX_W, height: BOX_H }}>
        <Group transform={[{ scaleX: BOX_W / COLS }, { scaleY: BOX_H / ROWS }]}>
          <Picture picture={picture} />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: BOX_W + 2,
    height: BOX_H + 2,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(22,48,31,0.16)",
    backgroundColor: colors.paperDeep,
  },
});
