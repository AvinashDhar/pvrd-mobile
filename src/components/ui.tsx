import { Image } from "expo-image";
import { Link, type Href } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import type { ProductCard } from "@/lib/api";
import { formatINR } from "@/lib/money";

export function ScreenLoader() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}

export function Message({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={styles.message}>
      <Text style={styles.messageText}>{text}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, kicker }: { title: string; kicker: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function PriceBlock({ product, light = false }: { product: Pick<ProductCard, "mrp" | "price">; light?: boolean }) {
  const trade = typeof product.price === "number";
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.price, light && styles.lightText]}>{formatINR(trade ? product.price : product.mrp)}</Text>
      <Text style={[styles.priceLabel, light && styles.lightMuted]}>{trade ? "Trade" : "MRP"}</Text>
      {trade && product.mrp !== product.price ? (
        <Text style={[styles.mrpStrike, light && styles.lightMuted]}>{formatINR(product.mrp)}</Text>
      ) : null}
    </View>
  );
}

export function ProductCardView({ product }: { product: ProductCard }) {
  return (
    <Link href={`/product/${product.id}` as Href} asChild>
      <Pressable style={styles.card}>
        <Image source={{ uri: product.image }} style={styles.cardImage} contentFit="contain" />
        <View style={styles.cardBody}>
          <Text style={styles.cardKicker} numberOfLines={1}>
            {product.category}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.name}
          </Text>
          <PriceBlock product={product} light />
        </View>
      </Pressable>
    </Link>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.steel}
        {...props}
        style={[styles.input, error ? styles.inputError : null, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  variant?: "primary" | "lime" | "outline";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.button, variant === "lime" && styles.buttonLime, variant === "outline" && styles.buttonOutline]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "outline" ? colors.navy : variant === "lime" ? colors.navy : colors.white} />
      ) : (
        <Text style={[styles.buttonText, variant !== "primary" && styles.buttonTextNavy]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  message: { padding: 24, alignItems: "flex-start", gap: 12 },
  messageText: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  retry: { backgroundColor: colors.navy, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  section: { marginTop: 28, marginBottom: 12 },
  kicker: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },
  sectionTitle: { marginTop: 4, color: colors.navy, fontFamily: fonts.semibold, fontSize: 24 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 },
  price: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  priceLabel: { color: colors.steel, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  mrpStrike: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13, textDecorationLine: "line-through" },
  lightText: { color: colors.white },
  lightMuted: { color: "rgba(255,255,255,0.7)" },
  card: { backgroundColor: colors.card, borderRadius: radius, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  cardImage: { height: 160, backgroundColor: colors.white },
  cardBody: { backgroundColor: colors.navyDeep, paddingHorizontal: 14, paddingVertical: 12 },
  cardKicker: { color: "rgba(255,255,255,0.7)", fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  cardTitle: { marginTop: 4, color: colors.white, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  field: { gap: 6 },
  fieldLabel: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    color: colors.navy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13 },
  button: { height: 48, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  buttonLime: { backgroundColor: colors.lime },
  buttonOutline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 16 },
  buttonTextNavy: { color: colors.navy },
});
