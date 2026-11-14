import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { Message, ProductCardView, ScreenLoader, SectionTitle } from "@/components/ui";
import { api, type Banner, type Brand, type Category, type Offer, type ProductCard } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const [query, setQuery] = useState("");
  const banners = useQuery({ queryKey: ["banners"], queryFn: () => api<{ data: Banner[] }>("/api/v1/banners") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<{ data: Category[] }>("/api/v1/categories") });
  const products = useQuery({
    queryKey: ["products", "", "", token],
    queryFn: () => api<{ data: ProductCard[] }>("/api/v1/products"),
  });
  const offers = useQuery({ queryKey: ["offers"], queryFn: () => api<{ data: Offer[] }>("/api/v1/offers") });
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api<{ data: Brand[] }>("/api/v1/brands") });

  if (products.isLoading && categories.isLoading) return <ScreenLoader />;

  const hero = banners.data?.data[0];
  const openSearch = () => router.navigate({ pathname: "/products", params: { q: query.trim(), category: "" } });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        {hero?.image ? <Image source={{ uri: hero.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
        <Image source={require("@/assets/images/logo.png")} style={styles.logo} contentFit="contain" />
        <Text style={styles.eyebrow}>{hero ? "Featured · OM PVRD" : "Catalogue · OM PVRD"}</Text>
        <Text style={styles.heroTitle}>{hero?.title || "Hardware fittings for every opening"}</Text>
        <Text style={styles.heroText}>{hero?.description || "Browse the current ranges, then open a category to see products."}</Text>
        <View style={styles.search}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={openSearch}
            placeholder="Search fittings…"
            placeholderTextColor="rgba(255,255,255,0.65)"
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
        <Pressable onPress={openSearch} style={styles.shop}>
          <Text style={styles.shopText}>Shop fittings</Text>
        </Pressable>
      </View>

      {categories.isError ? <Message text={categories.error.message} onRetry={() => categories.refetch()} /> : null}
      <View style={styles.pad}>
        <SectionTitle kicker="Collections" title="Shop by category" />
        <View style={styles.grid}>
          {(categories.data?.data ?? []).slice(0, 8).map((category) => (
            <Pressable
              key={category.id}
              style={styles.category}
              onPress={() => router.navigate({ pathname: "/products", params: { category: category.slug, q: "" } })}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} contentFit="cover" />
              <Text style={styles.categoryName} numberOfLines={2}>
                {category.name}
              </Text>
              <Text style={styles.categoryCount}>{category.products} products</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle kicker="Featured" title="Ready to specify" />
        {products.isError ? <Message text={products.error.message} onRetry={() => products.refetch()} /> : null}
        <View style={styles.list}>
          {(products.data?.data ?? []).slice(0, 8).map((product) => (
            <ProductCardView key={product.id} product={product} />
          ))}
        </View>

        {offers.data?.data.length ? (
          <>
            <SectionTitle kicker="This month" title="Public offers" />
            {offers.data.data.map((offer) => (
              <Pressable key={offer.id} style={styles.offer} onPress={() => router.navigate("/products")}>
                <Text style={styles.kicker}>{offer.type}</Text>
                <Text style={styles.offerName}>{offer.name}</Text>
                <Text style={styles.offerScope}>{offer.scope}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {brands.data?.data.length ? (
          <>
            <SectionTitle kicker="Brands" title="Ranges we stock" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
              {brands.data.data.map((brand) => (
                <View key={brand.id} style={styles.brand}>
                  <Image source={{ uri: brand.image }} style={styles.brandImage} contentFit="contain" />
                  <Text style={styles.brandName} numberOfLines={1}>
                    {brand.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { minHeight: 420, justifyContent: "flex-end", padding: 20, gap: 8, overflow: "hidden" },
  heroShade: { backgroundColor: "rgba(0,31,61,0.72)" },
  logo: { width: 148, height: 48, marginBottom: 12 },
  eyebrow: { color: colors.lime, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 32, lineHeight: 38 },
  heroText: { color: "rgba(255,255,255,0.82)", fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  search: { marginTop: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  searchInput: { height: 48, paddingHorizontal: 18, color: colors.white, fontFamily: fonts.regular, fontSize: 16 },
  shop: { alignSelf: "flex-start", marginTop: 8, backgroundColor: colors.lime, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  shopText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 15 },
  pad: { paddingHorizontal: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  category: { width: "47%", backgroundColor: colors.card, borderRadius: radius, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  categoryImage: { height: 96, backgroundColor: colors.muted },
  categoryName: { paddingHorizontal: 10, paddingTop: 10, color: colors.navy, fontFamily: fonts.semibold, fontSize: 15 },
  categoryCount: { paddingHorizontal: 10, paddingBottom: 12, paddingTop: 2, color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  list: { gap: 12 },
  offer: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  kicker: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  offerName: { marginTop: 6, color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  offerScope: { marginTop: 4, color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
  brandRow: { gap: 12, paddingRight: 16 },
  brand: { width: 120, backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 10 },
  brandImage: { height: 64, backgroundColor: colors.white },
  brandName: { marginTop: 8, color: colors.navy, fontFamily: fonts.medium, fontSize: 13 },
});
