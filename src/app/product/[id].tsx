import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { numericAmount, ProductVariantPicker, useVariantSelection } from "@/components/product-variants";
import { AccountBenefits } from "@/components/account-benefits";
import { ProductGallery } from "@/components/product-gallery";
import { Button, Message, PriceBlock, ProductGrid, ScreenLoader } from "@/components/ui";
import { ApiError, api, type ProductDetail } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const client = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const product = useQuery({
    queryKey: ["product", id, token],
    queryFn: () => api<{ data: ProductDetail; trade: boolean }>(`/api/v1/products/${id}`),
  });
  const selection = useVariantSelection(product.data?.data.variants ?? []);

  if (product.isLoading) return <ScreenLoader />;
  if (product.isError || !product.data) {
    return <Message text={product.error?.message || "Product not found."} onRetry={() => product.refetch()} />;
  }

  const item = product.data.data;
  const picked = selection.selected;
  const mrp = numericAmount(picked?.mrp) ?? item.mrp;
  const tradePrice = picked && picked.price != null && picked.price !== "" ? numericAmount(picked.price) ?? item.price : item.price;
  const pickedLabel = [picked?.size, picked?.finish].filter(Boolean).join(" · ");

  async function addToQuotation() {
    if (!token) {
      router.push({ pathname: "/login", params: { notice: "quotation" } });
      return;
    }
    if (item.variants.length > 0 && !picked?.id) {
      setNotice("Choose a finish and size first.");
      return;
    }
    setAdding(true);
    setNotice("");
    try {
      await api("/api/v1/quotations/bucket", {
        method: "POST",
        body: JSON.stringify({ productId: item.id, variantId: picked?.id, quantity }),
      });
      setNotice("Added to your quotation bucket.");
      await client.invalidateQueries({ queryKey: ["bucket"] });
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "This could not be added.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ProductGallery images={item.images?.length ? item.images : [item.image]} name={item.name} />
      <View style={styles.panel}>
        <Text style={styles.kicker}>{item.category}</Text>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.brand}
          {item.sku ? ` · ${item.sku}` : ""}
        </Text>
        <PriceBlock product={{ mrp, price: tradePrice ?? undefined }} light />
        {pickedLabel ? <Text style={styles.selection}>{pickedLabel}</Text> : null}
      </View>
      <View style={styles.body}>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        {item.displayRates.map((rate) => (
          <View key={rate.label} style={styles.spec}>
            <Text style={styles.specLabel}>{rate.label}</Text>
            <Text style={styles.specValue}>{rate.value ?? "—"}</Text>
            <Text style={styles.formula}>{rate.formula}</Text>
          </View>
        ))}
        {item.specs.map((spec) => (
          <View key={spec.label} style={styles.spec}>
            <Text style={styles.specLabel}>{spec.label}</Text>
            <Text style={styles.specValue}>{spec.value}</Text>
          </View>
        ))}
        <ProductVariantPicker selection={selection} />
        <View style={styles.quote}>
          <Text style={styles.quoteTitle}>{token ? "Request a quotation" : "Sign in to unlock"}</Text>
          {token ? (
            <Text style={styles.quoteHint}>
              Add this {pickedLabel || "product"} with a quantity, then request the quotation and discuss it with OM PVRD.
            </Text>
          ) : (
            <AccountBenefits />
          )}
          <View style={styles.stepper}>
            <Pressable accessibilityLabel="Decrease quantity" onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.step}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>{quantity}</Text>
            <Pressable accessibilityLabel="Increase quantity" onPress={() => setQuantity((value) => Math.min(999, value + 1))} style={styles.step}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          <Button label={token ? "Add to quotation" : "Sign in to add"} onPress={addToQuotation} busy={adding} />
          {token ? null : <Button label="Create account" variant="outline" onPress={() => router.push("/signup")} />}
          {notice ? <Text style={styles.quoteNotice}>{notice}</Text> : null}
          {token ? (
            <>
              <Button label="Request quotation" variant="outline" onPress={() => router.push("/quote")} />
              <Button label="Discuss with OM PVRD" variant="outline" onPress={() => router.push("/quotes")} />
            </>
          ) : null}
        </View>
        {item.related.length ? (
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>You may also like</Text>
            <ProductGrid products={item.related} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  panel: { backgroundColor: colors.navyDeep, padding: 20 },
  kicker: { color: "rgba(255,255,255,0.7)", fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  name: { marginTop: 4, color: colors.white, fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34 },
  meta: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontFamily: fonts.regular, fontSize: 15 },
  selection: { marginTop: 6, color: "rgba(255,255,255,0.72)", fontFamily: fonts.medium, fontSize: 14 },
  body: { padding: 16, gap: 12 },
  description: { color: colors.steel, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  spec: { backgroundColor: colors.muted, borderRadius: radius, padding: 14 },
  specLabel: { color: colors.steel, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  specValue: { marginTop: 4, color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  formula: { marginTop: 2, color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  quote: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  quoteTitle: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  quoteHint: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  quoteNotice: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  step: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  stepText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24 },
  stepValue: { minWidth: 28, textAlign: "center", color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  related: { marginTop: 8 },
  relatedTitle: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 20 },
});
