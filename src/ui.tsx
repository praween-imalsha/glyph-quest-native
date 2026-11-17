import { Text as RNText, type TextProps } from "react-native";

/**
 * The pixel UI is laid out in fixed-size boxes, so text ignores the system
 * font-size setting. Every screen imports Text from here instead of react-native.
 */
export function Text(props: TextProps) {
  return <RNText allowFontScaling={false} {...props} />;
}
