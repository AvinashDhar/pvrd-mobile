import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { FormScroll } from "@/components/form-scroll";
import { Button, Message, ScreenLoader } from "@/components/ui";
import { ApiError, api, type Bucket, type BucketItem } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { useSession } from "@/lib/session";

export default function QuoteBucketScreen() {
  const { token, ready } = useSession();
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const bucket = useQuery({
    queryKey: ["bucket", token],
    enabled: ready && Boolean(token),
    staleTime: 0,
    queryFn: () => api<{ data: Bucket }>("/api/v1/quotations/bucket"),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ["bucket"] });

  const changeQty = useMutation({
    mutationFn: (item: { itemId: string; quantity: number }) =>
      api("/api/v1/quotations/bucket", { method: "PATCH", body: JSON.stringify(item) }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (itemId: string) => api(`/api/v1/quotations/bucket?itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const request = useMutation({
    mutationFn: () => api<{ data: { id: string } }>("/api/v1/quotations", { method: "POST", body: JSON.stringify({ note }) }),
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["bucket"] });
      await client.invalidateQueries({ queryKey: ["quotations"] });
      router.replace(`/quotes/${result.data.id}`);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "The quotation could not be requested."),
  });

  if (!ready || (token && bucket.isLoading)) return <ScreenLoader />;
  if (!token) {
    return (
      <View style={styles.empty}>
        <Text style={styles.lead}>Sign in to keep a quotation bucket.</Text>
        <Button label="Sign in" onPress={() => router.push({ pathname: "/login", params: { notice: "quotation" } })} />
      </View>
    );
  }
  if (bucket.isError) return <Message text={bucket.error.message} onRetry={() => bucket.refetch()} />;

  const items = bucket.data?.data.items ?? [];
  return (
    <FormScroll style={styles.screen} contentContainerStyle={styles.content}>
      {items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.lead}>Nothing is in the bucket yet. Open a product and add a size with a quantity.</Text>
          <Button label="Browse products" onPress={() => router.push("/products")} />
        </View>
      ) : (
        items.map((item) => (
          <Line
            key={item.id}
            item={item}
            busy={changeQty.isPending || remove.isPending}
            onQuantity={(quantity) => changeQty.mutate({ itemId: item.id, quantity })}
            onRemove={() => remove.mutate(item.id)}
          />
        ))
      )}
      {items.length ? (
        <View style={styles.card}>
          <Text style={styles.label}>Note for OM PVRD</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Site, delivery town, or anything the counter should know"
            placeholderTextColor={colors.steel}
            multiline
            maxLength={500}
            style={styles.note}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Request quotation" onPress={() => request.mutate()} busy={request.isPending} />
          <Button label="My quotations" variant="outline" onPress={() => router.push("/quotes")} />
        </View>
      ) : (
        <Button label="My quotations" variant="outline" onPress={() => router.push("/quotes")} />
      )}
    </FormScroll>
  );
}

function Line({
  item,
  busy,
  onQuantity,
  onRemove,
}: {
  item: BucketItem;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const option = [item.size, item.finish].filter(Boolean).join(" · ");
  const [draft, setDraft] = useState(String(item.quantity));

  useEffect(() => {
    setDraft(String(item.quantity));
  }, [item.quantity]);

  function commit(text: string) {
    const quantity = Number(text);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      setDraft(String(item.quantity));
      return;
    }
    setDraft(String(quantity));
    if (quantity !== item.quantity) onQuantity(quantity);
  }

  function step(next: number) {
    const quantity = Math.min(999, Math.max(1, next));
    setDraft(String(quantity));
    if (quantity !== item.quantity) onQuantity(quantity);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{item.name}</Text>
          {option ? <Text style={styles.meta}>{option}</Text> : null}
        </View>
        <Pressable
          accessibilityLabel={`Delete ${item.name}${option ? `, ${option}` : ""}`}
          disabled={busy}
          hitSlop={8}
          onPress={onRemove}
          style={styles.delete}
        >
          <SymbolView name={{ ios: "trash.fill", android: "delete", web: "delete" }} tintColor={colors.danger} size={22} />
        </Pressable>
      </View>
      {!item.available ? <Text style={styles.error}>This product is no longer listed. Delete it before requesting.</Text> : null}
      <View style={styles.row}>
        <View style={styles.stepper}>
          <Pressable accessibilityLabel="Decrease quantity" disabled={busy || item.quantity <= 1} onPress={() => step(item.quantity - 1)} style={styles.step}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <TextInput
            accessibilityLabel={`Quantity for ${item.name}`}
            value={draft}
            onChangeText={(value) => setDraft(value.replace(/\D/g, "").slice(0, 3))}
            onBlur={() => commit(draft)}
            onSubmitEditing={() => commit(draft)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            selectTextOnFocus
            style={styles.qtyInput}
          />
          <Pressable accessibilityLabel="Increase quantity" disabled={busy || item.quantity >= 999} onPress={() => step(item.quantity + 1)} style={styles.step}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.prices}>
          <Text style={styles.price}>{formatINR(item.tradePrice || item.unitPrice)}</Text>
          <Text style={styles.priceTag}>Trade</Text>
          <Text style={styles.mrpPrice}>{formatINR(item.mrp || item.unitPrice)}</Text>
          <Text style={styles.priceTag}>MRP</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  lead: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  delete: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: -6, marginRight: -6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  stepText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24 },
  qtyInput: {
    width: 64,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    textAlign: "center",
    color: colors.navy,
    fontFamily: fonts.semibold,
    fontSize: 16,
    paddingVertical: 0,
  },
  prices: { alignItems: "flex-end", gap: 1 },
  price: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16, textAlign: "right" },
  mrpPrice: { marginTop: 4, color: colors.navy, fontFamily: fonts.semibold, fontSize: 15, textAlign: "right" },
  priceTag: { color: colors.steel, fontFamily: fonts.medium, fontSize: 11, textAlign: "right" },
  label: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  note: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 12,
    color: colors.navy,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: "top",
  },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
