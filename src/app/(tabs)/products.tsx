import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { Message, ProductCardView, ScreenLoader } from "@/components/ui";
import { api, type ProductCard } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { token } = useSession();
  const [q, setQ] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [draft, setDraft] = useState(params.q ?? "");

  useEffect(() => {
    setQ(params.q ?? "");
    setDraft(params.q ?? "");
    setCategory(params.category ?? "");
  }, [params.q, params.category]);
  const products = useQuery({
    queryKey: ["products", q, category, token],
    queryFn: () => {
      const search = new URLSearchParams();
      if (q) search.set("q", q);
      if (category) search.set("category", category);
      const suffix = search.toString() ? `?${search}` : "";
      return api<{ data: ProductCard[]; trade: boolean }>(`/api/v1/products${suffix}`);
    },
  });

  if (products.isLoading) return <ScreenLoader />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 12 }]}
      data={products.data?.data ?? []}
      keyExtractor={(item) => item.id}
      refreshing={products.isRefetching}
      onRefresh={() => products.refetch()}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Products</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => setQ(draft.trim())}
            placeholder="Search aldrops, handles, locks…"
            placeholderTextColor={colors.steel}
            returnKeyType="search"
            style={styles.search}
          />
          {category ? (
            <Text style={styles.filter} onPress={() => setCategory("")}>
              Category: {category} · Clear
            </Text>
          ) : null}
          {products.isError ? <Message text={products.error.message} onRetry={() => products.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={products.isError ? undefined : <Text style={styles.empty}>No products match this search.</Text>}
      renderItem={({ item }) => <ProductCardView product={item} />}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  header: { gap: 12, marginBottom: 16 },
  title: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 28 },
  search: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    color: colors.navy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  filter: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  empty: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15 },
  gap: { height: 12 },
});
