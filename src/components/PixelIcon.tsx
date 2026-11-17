import { View } from "react-native";

export type IconName =
  | "diamond"
  | "heart"
  | "play"
  | "pause"
  | "lock"
  | "check"
  | "sound"
  | "mute"
  | "arrow-up"
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "spark"
  | "map"
  | "book"
  | "lantern"
  | "restart";

const MAPS: Record<IconName, string[]> = {
  diamond: ["00100", "01110", "11111", "01110", "00100"],
  heart: ["11011", "11111", "11111", "01110", "00100"],
  play: ["10000", "11000", "11100", "11000", "10000"],
  pause: ["11011", "11011", "11011", "11011", "11011"],
  lock: ["01110", "01010", "11111", "11111", "11011"],
  check: ["00001", "00011", "11010", "01100", "00100"],
  sound: ["11000", "11010", "11001", "11010", "11000"],
  mute: ["11001", "11010", "11100", "11010", "11001"],
  "arrow-up": ["00100", "01110", "11111", "00100", "00100"],
  "arrow-down": ["00100", "00100", "11111", "01110", "00100"],
  "arrow-left": ["00100", "01100", "11111", "01100", "00100"],
  "arrow-right": ["00100", "00110", "11111", "00110", "00100"],
  spark: ["00100", "10101", "01110", "10101", "00100"],
  map: ["11111", "10001", "10101", "10001", "11111"],
  book: ["11110", "10010", "11110", "10010", "11111"],
  lantern: ["00100", "01110", "01010", "11111", "01110", "00100"],
  restart: ["01110", "10001", "00111", "01110", "10001"],
};

export function PixelIcon({
  name,
  size = 14,
  color = "#16301F",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const rows = MAPS[name];
  const cols = Math.max(...rows.map((row) => row.length));
  const unit = Math.max(1, Math.round(size / Math.max(cols, rows.length)));
  const width = cols * unit;
  const height = rows.length * unit;
  return (
    <View style={{ width, height }} accessibilityLabel={name}>
      {rows.map((row, y) =>
        row.split("").map((cell, x) =>
          cell === "1" ? (
            <View
              key={`${x}-${y}`}
              style={{
                position: "absolute",
                left: x * unit,
                top: y * unit,
                width: unit,
                height: unit,
                backgroundColor: color,
              }}
            />
          ) : null,
        ),
      )}
    </View>
  );
}
