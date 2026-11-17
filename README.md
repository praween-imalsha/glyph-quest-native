# Glyph Quest — native Android app

The Vite / react-native-web game, converted to a real React Native app for Android
(Expo SDK 58, React Native 0.88, React 19, Skia for rendering).

## Run it

```bash
npm install
npx expo run:android      # builds a dev client and installs it on a connected device / emulator
```

Needs Android Studio (SDK + an emulator or a USB-debugging phone). Skia and expo-audio are
native modules, so use `expo run:android` or an EAS development build.

## Build an installable APK (no Android Studio needed)

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview      # -> .apk you can sideload
npx eas-cli@latest build -p android --profile production   # -> .aab for Google Play
```

Change `android.package` in `app.json` (currently `com.glyphquest.app`) before publishing.

## What changed from the web version

| Web version | Native Android version |
| --- | --- |
| `<canvas>` via `react-native-web` | `@shopify/react-native-skia`. `src/game/gfx.ts` is a small Canvas2D-shaped adapter, so `render.ts` is almost unchanged. Floor and walls are recorded once per chamber as Skia pictures. |
| Keyboard input | Multi-touch controls (`src/components/Controls.tsx`): hold the D-pad and tap A at the same time. Diagonals and sliding between directions work. |
| WebAudio oscillators | The same square/saw/triangle arpeggios pre-rendered to WAV (`assets/sfx`, regenerate with `npm run sfx`), played with `expo-audio`. Haptics on hurt / glyph / door. |
| `localStorage` | `@react-native-async-storage/async-storage` (the save loads before the splash hides). |
| Google Fonts `<link>` | `@expo-google-fonts` (Press Start 2P, Silkscreen, DM Mono) bundled in the app. |
| CSS gradients / `backgroundImage` | `expo-linear-gradient`, plus Skia for scanlines and the glass glare. |
| `shadow*` styles (iOS only) | `boxShadow`, which renders on Android. |
| n/a | Android Back button, auto-pause when the app is backgrounded, screen stays awake while playing, edge-to-edge safe areas, portrait lock, adaptive + themed icon, splash screen. |

Game logic (`src/game/engine.ts`, `levels.ts`) is unchanged.

## Layout

```
App.tsx                     shell: fonts, safe areas, tabs, Back handler
src/game/                   engine, levels, render (Skia), gfx adapter, audio, session/save
src/components/             Console (handheld), Controls (multi-touch), GameCanvas, MiniMap, PixelIcon
src/screens/Bodies.tsx      Play / Chambers / Guide screens
assets/                     icons + sfx
```

## Notes

- The page does not scroll while a chamber is running (so a thumb drifting on the D-pad can't scroll
  the screen). On short phones the LCD narrows automatically so the controls stay on screen.
- Verified here: `tsc --noEmit` passes and `expo export --platform android` bundles to Hermes
  bytecode. It has not been run on a physical device or emulator.
