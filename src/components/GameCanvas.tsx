import { useImperativeHandle, useMemo, useState, type Ref } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Canvas, Group, LinearGradient, Picture, Rect, createPicture, vec, type SkPicture } from "@shopify/react-native-skia";
import { COLS, ROWS, TILE } from "../game/levels";
import { Gfx } from "../game/gfx";

const WORLD_W = COLS * TILE; // 160
const WORLD_H = ROWS * TILE; // 128

export interface GameCanvasHandle {
  /** Record one frame (in 160 x 128 world pixels) and show it. */
  draw: (paint: (ctx: Gfx) => void) => void;
}

/**
 * The play field. Each frame is recorded into a Skia picture in world pixels and
 * scaled up to fit, so pixel art stays hard-edged. The LCD scanlines and the glass
 * highlight that the web build did with CSS gradients are drawn here too.
 */
export function GameCanvas({ ref }: { ref?: Ref<GameCanvasHandle> }) {
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useImperativeHandle(
    ref,
    () => ({
      draw(paint) {
        setPicture(createPicture((canvas) => paint(new Gfx(canvas)), { width: WORLD_W, height: WORLD_H }));
      },
    }),
    [],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  const scanlines = useMemo(() => Array.from({ length: Math.ceil(size.h / 3) }, (_, i) => i * 3), [size.h]);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 && size.h > 0 && (
        <Canvas style={{ width: size.w, height: size.h }}>
          <Group transform={[{ scaleX: size.w / WORLD_W }, { scaleY: size.h / WORLD_H }]}>
            {picture && <Picture picture={picture} />}
          </Group>
          {scanlines.map((y) => (
            <Rect key={y} x={0} y={y} width={size.w} height={1} color="rgba(27,46,20,0.07)" />
          ))}
          <Rect x={0} y={0} width={size.w} height={size.h * 0.42}>
            <LinearGradient start={vec(0, 0)} end={vec(0, size.h * 0.42)} colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]} />
          </Rect>
        </Canvas>
      )}
    </View>
  );
}
