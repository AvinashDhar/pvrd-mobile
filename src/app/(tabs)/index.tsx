import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GuestOffer } from "@/components/account-benefits";
import { FormScroll } from "@/components/form-scroll";
import { colors, fonts, radius } from "@/constants/theme";
import { StudioCredit } from "@/components/studio-credit";
import { Message, ProductGrid, ScreenLoader, SectionTitle } from "@/components/ui";
import { api, type Banner, type Brand, type Category, type Offer, type ProductList } from "@/lib/api";
import { useSearchSheet } from "@/components/search-sheet";
import { useSession } from "@/lib/session";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const [query, setQuery] = useState("");
  const { openSearch } = useSearchSheet();
  const banners = useQuery({ queryKey: ["banners"], queryFn: () => api<{ data: Banner[] }>("/api/v1/banners") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<{ data: Category[] }>("/api/v1/categories") });
  const products = useQuery({
    queryKey: ["featured-products", token],
    queryFn: () => api<ProductList>("/api/v1/products?limit=8"),
  });
  const offers = useQuery({ queryKey: ["offers"], queryFn: () => api<{ data: Offer[] }>("/api/v1/offers") });
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api<{ data: Brand[] }>("/api/v1/brands") });

  if (products.isLoading && categories.isLoading) return <ScreenLoader />;

  const slides = (banners.data?.data ?? []).filter((banner) => banner.image);
  const submitSearch = () => openSearch(query.trim());
  const stats = [
    products.data ? { value: String(products.data.total), label: "Products" } : null,
    categories.data ? { value: String(categories.data.data.length), label: "Categories" } : null,
    brands.data ? { value: String(brands.data.data.length), label: "Brands" } : null,
  ].filter((item): item is { value: string; label: string } => item !== null);

  return (
    <FormScroll style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        {slides.length > 0 ? <BannerCarousel banners={slides} /> : <Image source={require("@/assets/images/logo.png")} style={styles.logo} contentFit="contain" />}
        <Text style={styles.eyebrow}>Catalogue · OM PVRD</Text>
        <Text style={styles.heroTitle}>Hardware fittings for every opening</Text>
        <Text style={styles.heroText}>Browse the current ranges, then open a category to see products and specifications.</Text>
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            accessibilityLabel="Search the catalogue"
            accessibilityHint="Opens matching products over this screen"
            placeholder="Search name, finish, size…"
            placeholderTextColor="rgba(255,255,255,0.6)"
            returnKeyType="search"
            style={styles.searchInput}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Search the catalogue" onPress={submitSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/products")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Shop fittings</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.navigate("/catalogues")} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Download catalogues</Text>
        </Pressable>
        {stats.length ? (
          <View style={styles.stats}>
            {stats.map((item) => (
              <View key={item.label} style={styles.stat}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {categories.isError ? <Message text={categories.error.message} onRetry={() => categories.refetch()} /> : null}
      <View style={styles.pad}>
        {token ? null : (
          <View style={styles.offerWrap}>
            <GuestOffer />
          </View>
        )}
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
        <ProductGrid products={products.data?.data ?? []} />

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
      <View style={styles.credit}>
        <StudioCredit />
      </View>
    </FormScroll>
  );
}

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(windowWidth - 32, 0);
  const height = Math.round(width * (9 / 16));
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      const next = (index.current + 1) % banners.length;
      index.current = next;
      setActive(next);
      scroller.current?.scrollTo({ x: next * width, animated: true });
    }, 5500);
    return () => clearInterval(timer);
  }, [banners.length, width]);

  return (
    <View style={[styles.carousel, { height }]}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        style={{ height }}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          index.current = next;
          setActive(next);
        }}
      >
        {banners.map((banner) => (
          <Pressable
            key={banner.id}
            accessibilityRole="link"
            accessibilityLabel={banner.title}
            style={{ width, height }}
            onPress={() => router.navigate("/products")}
          >
            <Image source={{ uri: banner.image ?? undefined }} style={{ width, height }} contentFit="cover" accessibilityLabel={banner.title} />
          </Pressable>
        ))}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {banners.map((banner, dot) => (
            <View key={banner.id} style={[styles.dot, dot === active && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.navyDeep, paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  logo: { width: 148, height: 48, marginBottom: 8 },
  carousel: { marginBottom: 8, borderRadius: 18, overflow: "hidden", backgroundColor: colors.muted },
  eyebrow: { marginTop: 4, color: colors.lime, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 32, lineHeight: 38 },
  heroText: { color: "rgba(255,255,255,0.82)", fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  searchWrap: {
    marginTop: 8,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
  },
  searchInput: { height: 48, paddingLeft: 18, paddingRight: 96, color: colors.white, fontFamily: fonts.regular, fontSize: 16 },
  searchButton: {
    position: "absolute",
    top: 6,
    right: 6,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  searchButtonText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 14 },
  primaryButton: { marginTop: 8, height: 44, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 15 },
  secondaryButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  stats: { marginTop: 12, flexDirection: "row", gap: 24 },
  stat: { gap: 2 },
  statValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 20 },
  statLabel: { color: "rgba(255,255,255,0.65)", fontFamily: fonts.regular, fontSize: 13 },
  dots: { position: "absolute", left: 0, right: 0, bottom: 10, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.75)" },
  dotActive: { width: 22, backgroundColor: colors.lime },
  pad: { paddingHorizontal: 16 },
  offerWrap: { marginTop: 16 },
  credit: { paddingHorizontal: 16, paddingBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  category: { width: "47%", backgroundColor: colors.card, borderRadius: radius, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  categoryImage: { height: 96, backgroundColor: colors.muted },
  categoryName: { paddingHorizontal: 10, paddingTop: 10, color: colors.navy, fontFamily: fonts.semibold, fontSize: 15 },
  categoryCount: { paddingHorizontal: 10, paddingBottom: 12, paddingTop: 2, color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  offer: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  kicker: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  offerName: { marginTop: 6, color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  offerScope: { marginTop: 4, color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
  brandRow: { gap: 12, paddingRight: 16 },
  brand: { width: 120, backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 10 },
  brandImage: { height: 64, backgroundColor: colors.white },
  brandName: { marginTop: 8, color: colors.navy, fontFamily: fonts.medium, fontSize: 13 },
});
