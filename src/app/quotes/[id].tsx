import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { FormScroll } from "@/components/form-scroll";
import { Message, ScreenLoader } from "@/components/ui";
import { ApiError, api, type QuotationDetail } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { useSession } from "@/lib/session";

const availability: Record<QuotationDetail["items"][number]["availability"], string> = {
  unspecified: "Availability not set",
  available: "Available",
  limited: "Limited stock",
  unavailable: "Not available",
};

const systemKinds = new Set(["close", "reopen"]);
const bubbleLabel: Record<string, string> = {
  availability: "Availability",
  accept: "Accepted",
  decline: "Declined",
};

function chatDay(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function chatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

function messageBody(kind: string, body: string) {
  if (kind === "availability") return body.replace(/^Availability update:\s*/, "");
  return body;
}

export default function QuotationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, ready } = useSession();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const thread = useRef<ScrollView>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const quotation = useQuery({
    queryKey: ["quotation", id, token],
    enabled: ready && Boolean(token) && Boolean(id),
    queryFn: () => api<{ data: QuotationDetail }>(`/api/v1/quotations/${id}`),
  });

  const messageCount = quotation.data?.data.messages.length ?? 0;
  useEffect(() => {
    const timer = setTimeout(() => thread.current?.scrollToEnd({ animated: false }), 40);
    return () => clearTimeout(timer);
  }, [messageCount]);

  function refresh() {
    return client.invalidateQueries({ queryKey: ["quotation", id] });
  }

  const send = useMutation({
    mutationFn: () => api(`/api/v1/quotations/${id}`, { method: "POST", body: JSON.stringify({ action: "comment", body: comment }) }),
    onSuccess: async () => {
      setComment("");
      setError("");
      await refresh();
      await client.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "The comment could not be sent."),
  });
  const close = useMutation({
    mutationFn: () => api(`/api/v1/quotations/${id}`, { method: "POST", body: JSON.stringify({ action: "close" }) }),
    onSuccess: async () => {
      await refresh();
      await client.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "This quotation could not be closed."),
  });

  function confirmClose() {
    Alert.alert("Close this quotation?", "Replies stop once it is closed. Open a new quotation from the bucket if you need another.", [
      { text: "Keep open", style: "cancel" },
      { text: "Close quotation", style: "destructive", onPress: () => close.mutate() },
    ]);
  }

  if (!ready || quotation.isLoading) return <ScreenLoader />;
  if (!token) return <Message text="Sign in to open this quotation." />;
  if (quotation.isError || !quotation.data) return <Message text={quotation.error?.message || "Quotation not found."} onRetry={() => quotation.refetch()} />;

  const item = quotation.data.data;
  const open = item.status === "open";
  let previousDay = "";

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: open
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close quotation"
                  disabled={close.isPending}
                  hitSlop={8}
                  onPress={confirmClose}
                  style={styles.closeButton}
                >
                  <SymbolView name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }} tintColor={colors.danger} size={18} />
                  <Text style={styles.closeText}>{close.isPending ? "Closing" : "Close"}</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <FormScroll style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]} bottomOffset={28} nestedScrollEnabled>
        <Text style={styles.reference}>{item.reference}</Text>
        <Text style={styles.meta}>
          {item.status === "open" ? "Opened" : "Closed"} · {item.outcome === "pending" ? "Waiting for OM PVRD" : item.outcome === "accepted" ? "Accepted" : "Declined"}
        </Text>
        {item.items.map((line) => {
          const option = [line.size, line.finish].filter(Boolean).join(" · ");
          return (
            <View key={line.id} style={styles.card}>
              <Text style={styles.name}>{line.name}</Text>
              {option ? <Text style={styles.meta}>{option}</Text> : null}
              <Text style={styles.meta}>
                {line.quantity} × {formatINR(line.unitPrice)} {line.priceLabel === "trade" ? "trade" : "MRP"}
                {line.packing ? ` · ${line.packing}` : ""}
              </Text>
              <Text style={styles.availability}>{availability[line.availability]}{line.leadTime ? ` · ${line.leadTime}` : ""}</Text>
              {line.itemNote ? <Text style={styles.meta}>{line.itemNote}</Text> : null}
            </View>
          );
        })}

      <View style={[styles.chatBox, { height: Math.max(420, Math.round(height * 0.62)) }]}>
        <View style={styles.chatHead}>
          <Text style={styles.chatTitle}>Discussion</Text>
          <Text style={styles.chatHint}>{open ? "With OM PVRD" : "Closed"}</Text>
        </View>
        <ScrollView
          ref={thread}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {item.messages.length === 0 ? <Text style={styles.day}>No messages yet.</Text> : null}
          {item.messages.map((message) => {
            const day = chatDay(message.createdAt);
            const showDay = day && day !== previousDay;
            if (showDay) previousDay = day;
            const time = chatTime(message.createdAt);
            if (systemKinds.has(message.kind)) {
              return (
                <View key={message.id} style={styles.systemWrap}>
                  {showDay ? <Text style={styles.day}>{day}</Text> : null}
                  <Text style={styles.system}>{message.body}{time ? ` · ${time}` : ""}</Text>
                </View>
              );
            }
            const mine = message.role === "user";
            const label = bubbleLabel[message.kind];
            return (
              <View key={message.id} style={styles.turn}>
                {showDay ? <Text style={styles.day}>{day}</Text> : null}
                <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
                  {mine ? null : <Text style={styles.speaker}>OM PVRD</Text>}
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    {label ? <Text style={[styles.bubbleLabel, mine ? styles.mineLabel : styles.theirsLabel]}>{label}</Text> : null}
                    <Text style={[styles.body, mine ? styles.mineBody : styles.theirsBody]}>{messageBody(message.kind, message.body)}</Text>
                    {time ? <Text style={[styles.stamp, mine ? styles.mineStamp : styles.theirsStamp]}>{time}</Text> : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {open ? (
          <View style={styles.composer}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.composerRow}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Reply about quantity, site, or delivery"
                placeholderTextColor={colors.steel}
                multiline
                maxLength={2000}
                style={styles.note}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send reply"
                disabled={!comment.trim() || send.isPending}
                onPress={() => send.mutate()}
                style={[styles.send, (!comment.trim() || send.isPending) && styles.sendDisabled]}
              >
                <Text style={styles.sendText}>{send.isPending ? "…" : "Send"}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.closedBar}>
            <Text style={styles.meta}>This quotation is closed. Open a new one from the bucket when you need another.</Text>
          </View>
        )}
      </View>
      </FormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  reference: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 28 },
  card: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  name: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  availability: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FDECEC",
  },
  closeText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 13 },
  chatBox: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  chatHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  chatTitle: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  chatHint: { color: colors.steel, fontFamily: fonts.medium, fontSize: 12 },
  thread: { flex: 1, backgroundColor: "#E7EEF4" },
  threadContent: { padding: 12, gap: 10 },
  turn: { gap: 10 },
  day: { alignSelf: "center", color: colors.steel, fontFamily: fonts.medium, fontSize: 12, backgroundColor: colors.white, borderRadius: 999, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 4 },
  systemWrap: { alignItems: "center", gap: 10 },
  system: { color: colors.steel, fontFamily: fonts.medium, fontSize: 12, textAlign: "center", backgroundColor: colors.white, borderRadius: 999, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6 },
  bubbleWrap: { maxWidth: "84%", gap: 4 },
  mineWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirsWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  speaker: { color: colors.steel, fontFamily: fonts.medium, fontSize: 12, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 4 },
  mine: { backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  mineLabel: { color: colors.lime },
  theirsLabel: { color: colors.navy },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  mineBody: { color: colors.white },
  theirsBody: { color: colors.navy },
  stamp: { fontFamily: fonts.regular, fontSize: 11, alignSelf: "flex-end" },
  mineStamp: { color: "rgba(255,255,255,0.72)" },
  theirsStamp: { color: colors.steel },
  composer: { gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  note: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.navy,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  send: { height: 44, borderRadius: 22, backgroundColor: colors.navy, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  closedBar: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 14 },
});
