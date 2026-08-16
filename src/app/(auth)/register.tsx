import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  PENDING_CONSENT_KEY,
  PRIVACY_URL,
  PRIVACY_VERSION,
  TERMS_URL,
  TERMS_VERSION,
} from "../../constants/legal";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert("Faltan datos", "Completá nombre, email y contraseña.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Contraseña muy corta", "Usá al menos 8 caracteres.");
      return;
    }

    if (!legalAccepted) {
      Alert.alert(
        "Aceptación necesaria",
        "Para crear tu cuenta debés aceptar los términos y la política de privacidad.",
      );
      return;
    }

    try {
      setSubmitting(true);
      await AsyncStorage.setItem(
        PENDING_CONSENT_KEY,
        JSON.stringify({
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          source: Platform.OS === "android" ? "android" : "ios",
        }),
      );

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName },
          emailRedirectTo: "https://www.lensup.network/login?confirmed=true",
        },
      });

      if (error) {
        await AsyncStorage.removeItem(PENDING_CONSENT_KEY);
        Alert.alert(
          "No pudimos crear la cuenta",
          error.code === "weak_password"
            ? "Elegí una contraseña más segura."
            : error.message,
        );
        return;
      }

      if (data.session) {
        const { error: consentError } = await supabase.rpc(
          "accept_legal_documents",
          {
            p_terms_version: TERMS_VERSION,
            p_privacy_version: PRIVACY_VERSION,
            p_source: Platform.OS === "android" ? "android" : "ios",
          },
        );

        if (!consentError) {
          await AsyncStorage.removeItem(PENDING_CONSENT_KEY);
        }
      }

      Alert.alert(
        "Revisá tu email",
        "Te enviamos un enlace para confirmar tu cuenta. Después vas a poder iniciar sesión.",
        [{ text: "Entendido", onPress: () => router.replace("/login") }],
      );
    } catch {
      Alert.alert("Ocurrió un error", "Revisá tu conexión e intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Lens<Text style={styles.brandAccent}>UP</Text></Text>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Sumate a la red audiovisual y empezá a conectar.</Text>

          <View style={styles.form}>
            <Field label="Nombre completo" value={fullName} onChangeText={setFullName} placeholder="Tu nombre" textContentType="name" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="nombre@email.com" keyboardType="email-address" textContentType="emailAddress" />
            <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry textContentType="newPassword" />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: legalAccepted }}
              onPress={() => setLegalAccepted((value) => !value)}
              style={styles.consentRow}
            >
              <View style={[styles.checkbox, legalAccepted && styles.checkboxChecked]}>
                {legalAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.consentText}>Acepto los </Text>
              <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>Términos</Text>
              <Text style={styles.consentText}> y la </Text>
              <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacidad</Text>
            </Pressable>

            <Pressable onPress={handleRegister} disabled={submitting} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]}>
              {submitting ? <ActivityIndicator color="#080808" /> : <Text style={styles.primaryButtonText}>Crear mi cuenta</Text>}
            </Pressable>

            <Link href="/login" style={styles.loginLink}>Ya tengo cuenta · Iniciar sesión</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

function Field({ label, ...props }: FieldProps) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} autoCapitalize="none" autoCorrect={false} placeholderTextColor="#666666" style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#080808" },
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 36 },
  brand: { marginBottom: 36, color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  brandAccent: { color: "#9A5CFF" },
  title: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  subtitle: { marginTop: 10, color: "#9A9A9A", fontSize: 16, lineHeight: 23 },
  form: { marginTop: 30, gap: 17 },
  field: { gap: 8 },
  label: { color: "#D4D4D4", fontSize: 14, fontWeight: "600" },
  input: { height: 54, borderWidth: 1, borderColor: "#292929", borderRadius: 16, paddingHorizontal: 16, backgroundColor: "#121212", color: "#FFFFFF", fontSize: 16 },
  consentRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", minHeight: 44 },
  checkbox: { width: 22, height: 22, alignItems: "center", justifyContent: "center", marginRight: 9, borderWidth: 1, borderColor: "#555", borderRadius: 6 },
  checkboxChecked: { borderColor: "#9A5CFF", backgroundColor: "#9A5CFF" },
  checkmark: { color: "#FFFFFF", fontWeight: "900" },
  consentText: { color: "#A3A3A3", fontSize: 13 },
  legalLink: { color: "#C7A7FF", fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
  primaryButton: { height: 56, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#FFFFFF" },
  primaryButtonText: { color: "#080808", fontSize: 16, fontWeight: "800" },
  loginLink: { paddingVertical: 10, color: "#C7A7FF", textAlign: "center", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
});
