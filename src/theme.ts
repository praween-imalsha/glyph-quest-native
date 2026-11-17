export const colors = {
  paper: "#E6E0CE",
  paperDeep: "#D9D2BE",
  cream: "#F7F2E6",
  ink: "#16301F",
  inkSoft: "rgba(22, 48, 31, 0.62)",
  inkFaint: "rgba(22, 48, 31, 0.38)",
  forest: "#1D3B28",
  moss: "#5C7A45",
  fern: "#7E9A52",
  lime: "#C6E07A",
  limeDeep: "#A8C45C",
  coral: "#D8573E",
  coralDeep: "#A33C28",
  shell: "#E8E2D0",
  shellEdge: "#B5AE9A",
  bezel: "#3C4036",
  bezelHi: "#5A5E52",
  bezelText: "#D7DACB",
  screen: "#D3E3A2",
  screenLight: "#E6F0C2",
  screenInk: "#1B2E14",
  screenDark: "#4E6A33",
  screenMid: "#8BA958",
  pale: "#E7EFC5",
  danger: "#8E3927",
  white: "#FFFcf4",
};

/** Names registered by useFonts() in App.tsx (Google Fonts via @expo-google-fonts). */
export const fonts = {
  pixel: "PressStart2P_400Regular",
  screen: "Silkscreen_400Regular",
  screenBold: "Silkscreen_700Bold",
  mono: "DMMono_400Regular",
  monoItalic: "DMMono_400Regular_Italic",
};

/** Android renders shadows from `boxShadow` (RN's old shadow* props are iOS-only). */
export const shadow = {
  card: { boxShadow: "0px 8px 16px rgba(22, 48, 31, 0.12)" },
  device: { boxShadow: "0px 18px 28px rgba(22, 48, 31, 0.28)" },
} as const;

export const hardShadow = (offset: number, color: string = colors.ink) => `${offset}px ${offset}px 0px ${color}`;
