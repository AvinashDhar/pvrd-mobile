import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import { AccountBenefits } from "@/components/account-benefits";
import { FormScroll } from "@/components/form-scroll";
import { Button, Field } from "@/components/ui";
import { ApiError, api, type SessionPayload } from "@/lib/api";
import { useReturnFromAuth } from "@/lib/return-from-auth";
import { useSession } from "@/lib/session";

const roles = [
  { value: "retailer", label: "Retailer" },
  { value: "contractor", label: "Carpenter / Contractor" },
  { value: "consumer", label: "Consumer" },
] as const;

export default function SignupScreen() {
  const { signIn } = useSession();
  const returnFromAuth = useReturnFromAuth();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [userType, setUserType] = useState<(typeof roles)[number]["value"]>("retailer");
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ data: SessionPayload | { status: "pending"; message: string } }>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, mobile, email, city, password, confirm, userType }),
      });
      if ("token" in result.data) {
        await signIn(result.data.token);
        await client.invalidateQueries();
        returnFromAuth();
        return;
      }
      router.dismissTo({ pathname: "/login", params: { notice: "pending" } });
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError("The account could not be created.", 0);
      setError(failure.message);
      setField(failure.field ?? "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScroll style={styles.screen} contentContainerStyle={styles.content}>
      <AccountBenefits />
      <Text style={styles.hint}>
        Retailer, carpenter, and contractor accounts see the discounted trade price. Carpenter and contractor accounts wait for approval. Consumer accounts can still request a quotation and discuss it with OM PVRD, and they see MRP.
      </Text>
      <Field label="Full name" value={name} onChangeText={setName} error={field === "name" ? error : undefined} />
      <Field label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" error={field === "mobile" ? error : undefined} />
      <Field label="Email (optional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={field === "email" ? error : undefined} />
      <Field label="City" value={city} onChangeText={setCity} error={field === "city" ? error : undefined} />
      <Text style={styles.label}>Account type</Text>
      {roles.map((role) => (
        <Pressable key={role.value} onPress={() => setUserType(role.value)} style={[styles.role, userType === role.value && styles.roleOn]}>
          <Text style={styles.roleText}>{role.label}</Text>
        </Pressable>
      ))}
      {field === "userType" ? <Text style={styles.error}>{error}</Text> : null}
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry error={field === "password" ? error : undefined} />
      <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry error={field === "confirm" ? error : undefined} />
      {error && !field ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create account" onPress={submit} busy={busy} />
    </FormScroll>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hint: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  role: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 14 },
  roleOn: { borderColor: colors.lime, backgroundColor: colors.muted },
  roleText: { color: colors.navy, fontFamily: fonts.medium, fontSize: 15 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 14 },
});
