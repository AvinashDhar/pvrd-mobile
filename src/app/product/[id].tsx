import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { Message, PriceBlock, ProductCardView, ScreenLoader } from "@/components/ui";
import { api, type ProductDetail } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { useSession } from "@/lib/session";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const product = useQuery({
    queryKey: ["product", id, token],
    queryFn: () => api<{ data: ProductDetail; trade: boolean }>(`/api/v1/products/${id}`),
  });

  if (product.isLoading) return <ScreenLoader />;
  if (product.isError || !product.data) {
    return <Message text={product.error?.message || "Product not found."} onRetry={() => product.refetch()} />;
  }

  const item = product.data.data;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Image source={{ uri: item.image }} style={styles.image} contentFit="contain" />
      <View style={styles.panel}>
        <Text style={styles.kicker}>{item.category}</Text>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.brand}
          {item.sku ? ` · ${item.sku}` : ""}
        </Text>
        <PriceBlock product={item} light />
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
        {item.variants.map((variant) => (
          <View key={`${variant.name}-${variant.size}-${variant.finish}`} style={styles.spec}>
            <Text style={styles.specValue}>{variant.name}</Text>
            <Text style={styles.formula}>
              {[variant.finish, variant.size].filter(Boolean).join(" · ") || "Variant"}
            </Text>
            <Text style={styles.specValue}>MRP {variant.mrp ? formatINR(variant.mrp) : "—"}</Text>
            {variant.price ? <Text style={styles.formula}>Trade {formatINR(variant.price)}</Text> : null}
          </View>
        ))}
        {item.related.length ? (
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>You may also like</Text>
            {item.related.map((related) => (
              <ProductCardView key={related.id} product={related} />
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  image: { height: 280, backgroundColor: colors.white },
  panel: { backgroundColor: colors.navyDeep, padding: 20 },
  kicker: { color: "rgba(255,255,255,0.7)", fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  name: { marginTop: 4, color: colors.white, fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34 },
  meta: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontFamily: fonts.regular, fontSize: 15 },
  body: { padding: 16, gap: 12 },
  description: { color: colors.steel, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  spec: { backgroundColor: colors.muted, borderRadius: radius, padding: 14 },
  specLabel: { color: colors.steel, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  specValue: { marginTop: 4, color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  formula: { marginTop: 2, color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  related: { gap: 12, marginTop: 8 },
  relatedTitle: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 20 },
});
