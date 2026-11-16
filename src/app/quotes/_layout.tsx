import { Stack } from "expo-router";
import { colors, fonts } from "@/constants/theme";

export default function QuotesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.navy,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "My quotations" }} />
      <Stack.Screen name="[id]" options={{ title: "Quotation" }} />
    </Stack>
  );
}
