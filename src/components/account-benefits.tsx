import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { Button } from "@/components/ui";

export const accountBenefits = [
  {
    title: "Discounted trade price",
    detail: "Retailer, carpenter, and contractor accounts see the dealer rate. Guests and consumer accounts see MRP.",
  },
  {
    title: "Request a quotation",
    detail: "After you sign in, add the sizes and quantities you need and send the list to OM PVRD.",
  },
  {
    title: "Discuss with OM PVRD",
    detail: "After you sign in, reply on an open quotation until you or OM PVRD closes it.",
  },
] as const;

export function AccountBenefits() {
  return (
    <View style={styles.list}>
      {accountBenefits.map((item) => (
        <View key={item.title} style={styles.row}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.detail}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

export function GuestOffer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push("/login")} style={styles.compact}>
        <Text style={styles.compactText}>
          Sign in for the discounted trade price, to request a quotation, and to discuss it with OM PVRD.
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Why sign in</Text>
      <AccountBenefits />
      <Button label="Sign in" onPress={() => router.push("/login")} />
      <Button label="Create account" variant="outline" onPress={() => router.push("/signup")} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { gap: 2 },
  title: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 15 },
  detail: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  kicker: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  compact: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  compactText: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
