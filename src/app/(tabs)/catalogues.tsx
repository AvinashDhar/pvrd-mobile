import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { Button, Message, ScreenLoader } from "@/components/ui";
import { api, type Catalogue } from "@/lib/api";

export default function CataloguesScreen() {
  const insets = useSafeAreaInsets();
  const catalogues = useQuery({
    queryKey: ["catalogues"],
    queryFn: () => api<{ data: Catalogue[] }>("/api/v1/catalogues"),
  });

  if (catalogues.isLoading) return <ScreenLoader />;
  if (catalogues.isError) return <Message text={catalogues.error.message} onRetry={() => catalogues.refetch()} />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 12 }]}
      data={catalogues.data?.data ?? []}
      keyExtractor={(item) => item.id}
      refreshing={catalogues.isRefetching}
      onRefresh={() => catalogues.refetch()}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Catalogues</Text>
          <Text style={styles.lead}>Print-ready PDFs for each category.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.image ? <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" /> : <View style={styles.image} />}
          <View style={styles.copy}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.count}>
              {item.products} active {item.products === 1 ? "product" : "products"}
              {item.pdfUrl ? "" : " · PDF not stored yet"}
            </Text>
            {item.viewUrl ? <Button label="View catalogue" variant="outline" onPress={() => WebBrowser.openBrowserAsync(item.viewUrl!)} /> : null}
            {item.pdfUrl ? <Button label="Download PDF" variant="outline" onPress={() => WebBrowser.openBrowserAsync(item.pdfUrl!)} /> : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 12 },
  header: { marginBottom: 8 },
  title: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 28 },
  lead: { marginTop: 4, color: colors.steel, fontFamily: fonts.regular, fontSize: 15 },
  row: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 12 },
  image: { height: 88, borderRadius: 12, backgroundColor: colors.muted },
  copy: { gap: 8 },
  name: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  count: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
});
