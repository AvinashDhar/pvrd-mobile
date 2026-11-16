import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants/theme";
import { GuestOffer } from "@/components/account-benefits";
import { StudioCredit } from "@/components/studio-credit";
import { Message, ProductCardView } from "@/components/ui";
import { api, type Category, type ProductCard, type ProductList } from "@/lib/api";
import { useSearchSheet } from "@/components/search-sheet";
import { useSession } from "@/lib/session";

const PAGE_SIZE = 40;

const sorts = [
  { id: "relevance", label: "Relevance" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name" },
] as const;

type SortId = (typeof sorts)[number]["id"];

function productKey(item: ProductCard) {
  return item.id;
}

const ProductCell = memo(function ProductCell({ product }: { product: ProductCard }) {
  return (
    <View style={styles.cell}>
      <ProductCardView product={product} />
    </View>
  );
});

function renderProduct({ item }: { item: ProductCard }) {
  return <ProductCell product={item} />;
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { token } = useSession();
  const listRef = useRef<FlashListRef<ProductCard>>(null);
  const loadingMore = useRef(false);
  const [q, setQ] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [sort, setSort] = useState<SortId>("relevance");
  const [sheet, setSheet] = useState<"sort" | "filter" | null>(null);

  useEffect(() => {
    setQ(params.q ?? "");
    setCategory(params.category ?? "");
  }, [params.q, params.category]);

  useEffect(() => {
    loadingMore.current = false;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [q, category, sort]);

  const products = useInfiniteQuery({
    queryKey: ["products", q, category, sort, token],
    initialPageParam: null as string | null,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam, signal }) => {
      const search = new URLSearchParams();
      search.set("limit", String(PAGE_SIZE));
      if (q) search.set("q", q);
      if (category) search.set("category", category);
      if (sort !== "relevance") search.set("sort", sort);
      if (pageParam) search.set("cursor", pageParam);
      return api<ProductList>(`/api/v1/products?${search}`, { signal });
    },
    getNextPageParam: (page) => page.nextCursor,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<{ data: Category[] }>("/api/v1/categories"),
  });

  const items = useMemo(() => products.data?.pages.flatMap((page) => page.data) ?? [], [products.data]);
  const total = products.data?.pages[0]?.total ?? items.length;
  const activeCategory = categories.data?.data.find((item) => item.slug === category);
  const categoryLabel = category ? (activeCategory?.name ?? category) : null;

  const loadMore = useCallback(() => {
    if (loadingMore.current || products.isPlaceholderData || !products.hasNextPage || products.isFetchingNextPage) return;
    loadingMore.current = true;
    products.fetchNextPage().finally(() => {
      loadingMore.current = false;
    });
  }, [products.isPlaceholderData, products.hasNextPage, products.isFetchingNextPage, products.fetchNextPage]);

  const refresh = useCallback(() => {
    products.refetch();
  }, [products.refetch]);

  const clearCategory = useCallback(() => setCategory(""), []);
  const openSort = useCallback(() => setSheet("sort"), []);
  const openFilter = useCallback(() => setSheet("filter"), []);

  const header = useMemo(
    () => (
      <ProductsHeader
        title={activeCategory?.name ?? "Products"}
        query={q}
        categoryLabel={categoryLabel}
        total={total}
        filtered={Boolean(category)}
        showGuest={!token}
        updating={products.isPlaceholderData}
        error={products.isError ? products.error.message : null}
        onClearCategory={clearCategory}
        onRetry={refresh}
        onOpenSort={openSort}
        onOpenFilter={openFilter}
      />
    ),
    [
      activeCategory?.name,
      q,
      categoryLabel,
      total,
      category,
      token,
      products.isPlaceholderData,
      products.isError,
      products.error,
      clearCategory,
      refresh,
      openSort,
      openFilter,
    ],
  );

  const footer = useMemo(
    () => (
      <View>
        {products.isFetchingNextPage ? <Text style={styles.more}>Loading more…</Text> : null}
        {products.isFetchNextPageError ? (
          <Pressable accessibilityRole="button" onPress={loadMore}>
            <Text style={styles.more}>Couldn't load more. Tap to retry.</Text>
          </Pressable>
        ) : null}
        <StudioCredit />
      </View>
    ),
    [products.isFetchingNextPage, products.isFetchNextPageError, loadMore],
  );

  const empty = useMemo(() => {
    if (products.isLoading || (products.isFetching && items.length === 0)) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.navy} />
        </View>
      );
    }
    if (products.isError) return null;
    return <Text style={styles.empty}>No products match this search. Try a name, SKU, description, finish, or size.</Text>;
  }, [products.isLoading, products.isFetching, products.isError, items.length]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" automaticOffset>
      <FlashList
        ref={listRef}
        style={styles.screen}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        data={items}
        keyExtractor={productKey}
        renderItem={renderProduct}
        numColumns={2}
        drawDistance={600}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={products.isRefetching && !products.isFetchingNextPage && !products.isPlaceholderData}
        onRefresh={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.8}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
      />
      <Modal visible={sheet !== null} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <View style={styles.modal}>
          <Pressable style={styles.backdrop} onPress={() => setSheet(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{sheet === "sort" ? "Sort" : "Category"}</Text>
            <ScrollView style={styles.sheetList}>
              {sheet === "sort"
                ? sorts.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[styles.option, sort === item.id && styles.optionOn]}
                      onPress={() => {
                        setSort(item.id);
                        setSheet(null);
                      }}
                    >
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {sort === item.id ? <Text style={styles.check}>✓</Text> : null}
                    </Pressable>
                  ))
                : [
                    <Pressable
                      key="all"
                      style={[styles.option, !category && styles.optionOn]}
                      onPress={() => {
                        setCategory("");
                        setSheet(null);
                      }}
                    >
                      <Text style={styles.optionLabel}>All products</Text>
                      {category ? null : <Text style={styles.check}>✓</Text>}
                    </Pressable>,
                    ...(categories.data?.data ?? []).map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.option, category === item.slug && styles.optionOn]}
                        onPress={() => {
                          setCategory(item.slug);
                          setSheet(null);
                        }}
                      >
                        <Text style={styles.optionLabel} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.optionMeta}>{item.products}</Text>
                      </Pressable>
                    )),
                  ]}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const ProductsHeader = memo(function ProductsHeader({
  title,
  query,
  categoryLabel,
  total,
  filtered,
  showGuest,
  updating,
  error,
  onClearCategory,
  onRetry,
  onOpenSort,
  onOpenFilter,
}: {
  title: string;
  query: string;
  categoryLabel: string | null;
  total: number;
  filtered: boolean;
  showGuest: boolean;
  updating: boolean;
  error: string | null;
  onClearCategory: () => void;
  onRetry: () => void;
  onOpenSort: () => void;
  onOpenFilter: () => void;
}) {
  const { openSearch } = useSearchSheet();
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => openSearch(draft.trim())}
        accessibilityLabel="Search the catalogue"
        accessibilityHint="Opens matching products over this screen"
        placeholder="Search name, finish, size…"
        placeholderTextColor={colors.steel}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.search}
      />
      {categoryLabel ? (
        <Text style={styles.filter} onPress={onClearCategory}>
          {categoryLabel} · Clear
        </Text>
      ) : null}
      {updating ? <Text style={styles.count}>Updating results…</Text> : total > 0 ? <Text style={styles.count}>{total} products</Text> : null}
      <View style={styles.bar}>
        <Pressable style={styles.barButton} onPress={onOpenSort}>
          <Text style={styles.barIcon}>⇅</Text>
          <Text style={styles.barLabel}>Sort</Text>
        </Pressable>
        <View style={styles.barDivider} />
        <Pressable style={styles.barButton} onPress={onOpenFilter}>
          <View>
            <Text style={styles.barIcon}>☰</Text>
            {filtered ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>1</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.barLabel}>Filter</Text>
        </Pressable>
      </View>
      {showGuest ? <GuestOffer compact /> : null}
      {error ? <Message text={error} onRetry={onRetry} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 12, gap: 12, marginBottom: 4 },
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
  count: { color: colors.steel, fontFamily: fonts.medium, fontSize: 13, marginTop: -4 },
  more: { color: colors.steel, fontFamily: fonts.medium, fontSize: 13, textAlign: "center", paddingVertical: 12 },
  loading: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  bar: {
    flexDirection: "row",
    marginHorizontal: -12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: colors.white,
  },
  barButton: { flex: 1, height: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  barIcon: { color: "#222222", fontFamily: fonts.semibold, fontSize: 16 },
  barLabel: { color: "#222222", fontFamily: fonts.semibold, fontSize: 14 },
  barDivider: { width: 1, backgroundColor: "#ECECEC" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E11D2E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10 },
  cell: { width: "100%", paddingHorizontal: 6, paddingBottom: 12 },
  empty: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15, paddingHorizontal: 16 },
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 20, 40, 0.35)" },
  sheet: {
    maxHeight: "70%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D5E0EA", marginBottom: 8 },
  sheetTitle: { paddingHorizontal: 16, paddingBottom: 8, color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  sheetList: { maxHeight: 360, paddingHorizontal: 12 },
  option: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionOn: { backgroundColor: colors.muted },
  optionLabel: { flex: 1, color: "#222222", fontFamily: fonts.medium, fontSize: 15 },
  optionMeta: { color: "#8A9199", fontFamily: fonts.medium, fontSize: 13 },
  check: { color: colors.navy, fontFamily: fonts.bold, fontSize: 16 },
});
