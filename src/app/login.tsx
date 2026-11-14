import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/constants/theme";
import { Button, Field } from "@/components/ui";
import { ApiError, api, type SessionPayload } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ notice?: string }>();
  const { signIn } = useSession();
  const client = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ data: SessionPayload }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      await signIn(result.data.token);
      await client.invalidateQueries();
      router.back();
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError("Sign-in failed.", 0);
      setError(failure.message);
      setField(failure.field ?? "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      {params.notice === "pending" ? (
        <Text style={styles.notice}>This account is waiting for an administrator to approve it.</Text>
      ) : null}
      <Field label="Mobile or email" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" error={field === "identifier" ? error : undefined} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry error={field === "password" ? error : undefined} />
      {error && field !== "identifier" && field !== "password" ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Sign in" onPress={submit} busy={busy} />
      <Button label="Create an account" variant="outline" onPress={() => router.push("/signup")} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 14 },
  notice: { color: colors.navy, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 14 },
});
