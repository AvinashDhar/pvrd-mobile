import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { Message, ScreenLoader } from "@/components/ui";
import { api, type Category } from "@/lib/api";

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<{ data: Category[] }>("/api/v1/categories") });

  if (categories.isLoading) return <ScreenLoader />;
  if (categories.isError) return <Message text={categories.error.message} onRetry={() => categories.refetch()} />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 12 }]}
      data={categories.data?.data ?? []}
      keyExtractor={(item) => item.id}
      refreshing={categories.isRefetching}
      onRefresh={() => categories.refetch()}
      ListHeaderComponent={<Text style={styles.title}>Categories</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.navigate({ pathname: "/products", params: { category: item.slug, q: "" } })}
        >
          <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" />
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.count}>{item.products} products</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 12 },
  title: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 28, marginBottom: 4 },
  row: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 10 },
  image: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.muted },
  copy: { flex: 1 },
  name: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 17 },
  count: { marginTop: 2, color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
});
