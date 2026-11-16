import { Linking, StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/constants/theme";

const STUDIO_URL = "https://flyingdevs.com";

export function StudioCredit() {
  return (
    <Text style={styles.line}>
      Crafted with love by{" "}
      <Text
        style={styles.name}
        accessibilityRole="link"
        onPress={() => {
          Linking.openURL(STUDIO_URL).catch(() => undefined);
        }}
      >
        flyingDevs Technologies
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  name: {
    color: colors.navy,
    fontFamily: fonts.medium,
  },
});
