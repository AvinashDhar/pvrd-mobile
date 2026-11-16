import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { Message } from "@/components/ui";
import { api, type ProductList } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { useSession } from "@/lib/session";

type SearchControls = {
  openSearch: (query?: string) => void;
};

const SearchContext = createContext<SearchControls | null>(null);

export function useSearchSheet() {
  const value = useContext(SearchContext);
  if (!value) throw new Error("Search is only available inside the catalogue.");
  return value;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const progress = useRef(new Animated.Value(0)).current;
  const resultsOpacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQ(draft.trim()), 220);
    return () => clearTimeout(timer);
  }, [draft]);

  const openSearch = useCallback(
    (query = "") => {
      setDraft(query);
      setQ(query.trim());
      setMounted((current) => {
        if (!current) progress.setValue(0);
        return true;
      });
    },
    [progress],
  );

  useEffect(() => {
    if (!mounted) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [mounted, progress, reduceMotion]);

  const dismiss = useCallback(
    (after?: () => void) => {
      Keyboard.dismiss();
      progress.stopAnimation();
      Animated.timing(progress, {
        toValue: 0,
        duration: reduceMotion ? 0 : 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setMounted(false);
        after?.();
      });
    },
    [progress, reduceMotion],
  );

  const products = useQuery({
    queryKey: ["search", q, token],
    enabled: mounted && q.length > 0,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api<ProductList>(`/api/v1/products?${new URLSearchParams({ q, limit: "24" })}`, { signal }),
  });

  useEffect(() => {
    if (!products.data) return;
    resultsOpacity.setValue(reduceMotion ? 1 : 0.4);
    Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [products.data, reduceMotion, resultsOpacity]);

  const rows = products.data?.data ?? [];
  const total = products.data?.total ?? rows.length;
  const searching = Boolean(q) && (products.isFetching || products.isPlaceholderData);
  const status = !q
    ? "Search name, SKU, description, finish, or size."
    : searching
      ? "Searching…"
      : products.isError
        ? "Search could not be completed."
        : total > rows.length
          ? `${rows.length} of ${total} products`
          : `${rows.length} ${rows.length === 1 ? "product" : "products"}`;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [72, 0] });

  return (
    <SearchContext.Provider value={{ openSearch }}>
      {children}
      <Modal visible={mounted} transparent animationType="none" onRequestClose={() => dismiss()} statusBarTranslucent>
        <View style={styles.root}>
          <Animated.View style={[styles.backdrop, { opacity: progress }]}>
            <Pressable style={styles.backdropPress} accessibilityLabel="Close search" onPress={() => dismiss()} />
          </Animated.View>
          <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.stage} pointerEvents="box-none">
            <Animated.View
              accessibilityViewIsModal
              style={[styles.sheet, { marginTop: Math.max(insets.top, 12) + 28, opacity: progress, transform: [{ translateY }] }]}
            >
              <View style={styles.handle} />
              <View style={styles.toolbar}>
                <Text style={styles.title}>Search</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={() => dismiss()} style={styles.close}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>
              <TextInput
                value={draft}
                autoFocus
                onChangeText={setDraft}
                accessibilityLabel="Search the catalogue"
                accessibilityHint="Matches name, SKU, description, finish, and size. Results stay over this screen."
                placeholder="Search name, finish, size…"
                placeholderTextColor={colors.steel}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={styles.input}
              />
              <Text accessibilityLiveRegion="polite" style={styles.status}>
                {status}
              </Text>
              {products.isError ? <Message text={products.error.message} onRetry={() => products.refetch()} /> : null}
              <Animated.View style={[styles.results, { opacity: resultsOpacity }]}>
                <FlatList
                  data={q && !products.isError ? rows : []}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                  ListEmptyComponent={
                    q && !searching && !products.isError ? (
                      <Text style={styles.empty}>No products match. Try a name, SKU, description, finish, or size.</Text>
                    ) : undefined
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}, ${item.category}`}
                      onPress={() => dismiss(() => router.push(`/product/${item.id}`))}
                      style={styles.row}
                    >
                      <Image source={{ uri: item.image }} style={styles.thumb} contentFit="contain" recyclingKey={item.id} />
                      <View style={styles.rowBody}>
                        <Text style={styles.kicker} numberOfLines={1}>
                          {item.category}
                        </Text>
                        <Text style={styles.name} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.price}>{formatINR(typeof item.price === "number" ? item.price : item.mrp)}</Text>
                      </View>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListFooterComponent={
                    q && !searching && !products.isError && total > rows.length ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => dismiss(() => router.navigate({ pathname: "/products", params: { q, category: "" } }))}
                        style={styles.seeAll}
                      >
                        <Text style={styles.seeAllText}>See all {total} products</Text>
                      </Pressable>
                    ) : undefined
                  }
                />
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SearchContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 31, 61, 0.46)" },
  backdropPress: { flex: 1 },
  stage: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    overflow: "hidden",
  },
  handle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  title: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 22 },
  close: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  closeText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  input: {
    height: 48,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    color: colors.navy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  status: { marginHorizontal: 20, marginTop: 12, marginBottom: 4, color: colors.steel, fontFamily: fonts.medium, fontSize: 13 },
  results: { flex: 1 },
  empty: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15, paddingHorizontal: 20, paddingTop: 12 },
  seeAll: { minHeight: 48, alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginTop: 8, borderRadius: radius },
  seeAllText: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 15 },
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
  thumb: { width: 64, height: 64, borderRadius: radius, backgroundColor: colors.muted },
  rowBody: { flex: 1, gap: 2 },
  kicker: { color: colors.steel, fontFamily: fonts.medium, fontSize: 11, textTransform: "uppercase" },
  name: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  price: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  separator: { height: 1, marginLeft: 92, backgroundColor: colors.border },
});
