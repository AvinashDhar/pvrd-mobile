import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/constants/theme";
import { Button, Field, Message, ScreenLoader } from "@/components/ui";
import { ApiError, api, type Account, type Company } from "@/lib/api";
import { formatDate } from "@/lib/money";
import { useSession } from "@/lib/session";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { token, ready, signOut } = useSession();
  const client = useQueryClient();
  const company = useQuery({ queryKey: ["company"], queryFn: () => api<{ data: Company }>("/api/v1/company") });
  const account = useQuery({
    queryKey: ["account", token],
    enabled: ready && Boolean(token),
    queryFn: () => api<{ data: Account }>("/api/v1/account"),
  });

  if (!ready || (token && account.isLoading)) return <ScreenLoader />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Account</Text>
      {token && account.data ? (
        <Profile account={account.data.data} onSaved={() => account.refetch()} onSignOut={async () => {
          await api("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
          await signOut();
          await client.invalidateQueries();
        }} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.lead}>Sign in to see the dealer rate on a retailer or carpenter account. Guests and consumers stay on MRP.</Text>
          <Button label="Sign in" onPress={() => router.push("/login")} />
          <Button label="Sign up" variant="outline" onPress={() => router.push("/signup")} />
          {account.isError ? <Message text={account.error.message} /> : null}
        </View>
      )}
      {company.data ? (
        <View style={styles.card}>
          <Text style={styles.kicker}>Contact</Text>
          <Text style={styles.company}>{company.data.data.companyName}</Text>
          {company.data.data.address ? <Text style={styles.meta}>{company.data.data.address}</Text> : null}
          {company.data.data.phone ? <Text style={styles.meta}>{company.data.data.phone}</Text> : null}
        </View>
      ) : null}
      <Link href="/" style={styles.home}>
        Back to the catalogue
      </Link>
    </ScrollView>
  );
}

function Profile({ account, onSaved, onSignOut }: { account: Account; onSaved: () => void; onSignOut: () => Promise<void> }) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email ?? "");
  const [city, setCity] = useState(account.city ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api("/api/v1/account", {
        method: "PATCH",
        body: JSON.stringify({ name, email, city, password, confirm }),
      });
      setPassword("");
      setConfirm("");
      setSaved(true);
      onSaved();
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError("The profile could not be saved.", 0);
      setError(failure.message);
      setField(failure.field ?? "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      {account.photoUrl ? <Image source={{ uri: account.photoUrl }} style={styles.photo} contentFit="cover" /> : null}
      <Text style={styles.role}>
        {account.role} · registered {formatDate(account.createdAt)}
      </Text>
      <Field label="Full name" value={name} onChangeText={setName} error={field === "name" ? error : undefined} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={field === "email" ? error : undefined} />
      <Field label="City" value={city} onChangeText={setCity} error={field === "city" ? error : undefined} />
      <Text style={styles.meta}>Mobile {account.mobile}</Text>
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry error={field === "password" ? error : undefined} />
      <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry error={field === "confirm" ? error : undefined} />
      {error && !field ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>Profile saved.</Text> : null}
      <Button label="Save profile" onPress={save} busy={busy} />
      <Button label="Sign out" variant="outline" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  title: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 28 },
  card: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  lead: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  kicker: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  company: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 18 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  home: { color: colors.navy, fontFamily: fonts.medium, fontSize: 15 },
  photo: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.muted },
  role: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 14 },
  saved: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
});
