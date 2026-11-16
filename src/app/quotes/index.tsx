import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { Button, Message, ScreenLoader } from "@/components/ui";
import { api, type QuotationSummary } from "@/lib/api";
import { formatDate } from "@/lib/money";
import { useSession } from "@/lib/session";

const decision: Record<QuotationSummary["outcome"], string> = {
  pending: "Waiting for OM PVRD",
  accepted: "Accepted",
  declined: "Declined",
};

const accent: Record<QuotationSummary["outcome"], string> = {
  pending: colors.navy,
  accepted: colors.lime,
  declined: colors.danger,
};

const outcomeTone: Record<QuotationSummary["outcome"], { backgroundColor: string; color: string }> = {
  pending: { backgroundColor: colors.muted, color: colors.navy },
  accepted: { backgroundColor: "#E7F3D0", color: "#3B5C12" },
  declined: { backgroundColor: "#FDECEC", color: colors.danger },
};

function itemLabel(count: number) {
  if (count <= 0) return "No items";
  if (count > 10) return "10+ items";
  return count === 1 ? "1 item" : `${count} items`;
}

function QuotationCard({ row }: { row: QuotationSummary }) {
  const previews = (row.previews ?? []).slice(0, 3);
  const tone = outcomeTone[row.outcome];
  const open = row.status === "open";
  const when = formatDate(row.updatedAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.reference}, ${open ? "Opened" : "Closed"}, ${decision[row.outcome]}, ${itemLabel(row.items)}`}
      onPress={() => router.push(`/quotes/${row.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.accent, { backgroundColor: open ? accent[row.outcome] : colors.steel }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.reference}>{row.reference}</Text>
          <View style={[styles.status, open ? styles.statusOpen : styles.statusClosed]}>
            <Text style={[styles.statusText, open ? styles.statusTextOpen : styles.statusTextClosed]}>{open ? "Opened" : "Closed"}</Text>
          </View>
        </View>
        <View style={[styles.outcome, { backgroundColor: tone.backgroundColor }]}>
          <Text style={[styles.outcomeText, { color: tone.color }]}>{decision[row.outcome]}</Text>
        </View>
        <View style={styles.previewRow}>
          {previews.length > 0 ? (
            <View style={styles.thumbs}>
              {previews.map((preview, index) =>
                preview.image ? (
                  <Image
                    key={`${preview.name}-${index}`}
                    source={{ uri: preview.image }}
                    style={[styles.thumb, index > 0 && styles.thumbOverlap, { zIndex: index + 1 }]}
                    contentFit="contain"
                    accessibilityLabel={preview.name}
                  />
                ) : (
                  <View key={`${preview.name}-${index}`} style={[styles.thumb, styles.thumbFallback, index > 0 && styles.thumbOverlap, { zIndex: index + 1 }]}>
                    <Text style={styles.thumbLetter}>{preview.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                ),
              )}
            </View>
          ) : null}
          <Text style={styles.count}>{itemLabel(row.items)}</Text>
        </View>
        {when ? <Text style={styles.date}>{when}</Text> : null}
      </View>
      <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor={colors.steel} size={16} />
    </Pressable>
  );
}

export default function QuotationsScreen() {
  const { token, ready } = useSession();
  const quotations = useQuery({
    queryKey: ["quotations", token],
    enabled: ready && Boolean(token),
    staleTime: 0,
    queryFn: () => api<{ data: QuotationSummary[] }>("/api/v1/quotations"),
  });

  if (!ready || (token && quotations.isLoading)) return <ScreenLoader />;
  if (!token) {
    return (
      <View style={styles.empty}>
        <Text style={styles.lead}>Sign in to see quotations you have requested.</Text>
        <Button label="Sign in" onPress={() => router.push({ pathname: "/login", params: { notice: "quotation" } })} />
      </View>
    );
  }
  if (quotations.isError) return <Message text={quotations.error.message} onRetry={() => quotations.refetch()} />;

  const rows = quotations.data?.data ?? [];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.lead}>You have no quotations yet. Add products to the bucket, then request one. Each request stays open until you or OM PVRD closes it.</Text>
          <Button label="Open the bucket" onPress={() => router.push("/quote")} />
        </View>
      ) : (
        rows.map((row) => <QuotationCard key={row.id} row={row} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 12,
    overflow: "hidden",
    shadowColor: colors.navyDeep,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: { backgroundColor: "#F7FBFF" },
  accent: { width: 5, alignSelf: "stretch" },
  body: { flex: 1, paddingVertical: 14, paddingLeft: 12, paddingRight: 8, gap: 8 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  reference: { flex: 1, color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusOpen: { backgroundColor: colors.navy },
  statusClosed: { backgroundColor: colors.muted },
  statusText: { fontFamily: fonts.semibold, fontSize: 12 },
  statusTextOpen: { color: colors.lime },
  statusTextClosed: { color: colors.steel },
  outcome: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  outcomeText: { fontFamily: fonts.medium, fontSize: 13 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumbs: { flexDirection: "row", alignItems: "center" },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.muted,
    borderWidth: 2,
    borderColor: colors.white,
  },
  thumbOverlap: { marginLeft: -10 },
  thumbFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#E4EEF6" },
  thumbLetter: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 14 },
  count: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 14 },
  date: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  lead: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
});
