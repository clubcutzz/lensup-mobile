import { Link } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import { PASSWORD_RECOVERY_URL } from "../../constants/legal";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert("Faltan datos", "Ingresá tu email y contraseña.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        Alert.alert("No pudimos iniciar sesión", error.message);
      }
    } catch {
      Alert.alert(
        "Ocurrió un error",
        "No pudimos iniciar sesión. Intentá nuevamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert("Ingresá tu email", "Lo necesitamos para enviarte el enlace de recuperación.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: PASSWORD_RECOVERY_URL,
      });

      if (error) throw error;

      Alert.alert("Revisá tu email", "Te enviamos un enlace para elegir una contraseña nueva.");
    } catch {
      Alert.alert("No pudimos enviar el enlace", "Intentá nuevamente en unos minutos.");
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
        <View style={styles.content}>
          <Text style={styles.brand}>LensUP</Text>
          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>
            Ingresá para descubrir oportunidades y conectar con profesionales.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nombre@email.com"
                placeholderTextColor="#666666"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                style={styles.input}
              />
            </View>

            <Pressable onPress={handleForgotPassword} disabled={submitting}>
              <Text style={styles.forgotPassword}>Olvidé mi contraseña</Text>
            </Pressable>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                placeholderTextColor="#666666"
                secureTextEntry
                textContentType="password"
                style={styles.input}
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#080808" />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              )}
            </Pressable>

            <Link href="/register" style={styles.registerLink}>
              ¿No tenés cuenta? Crear cuenta
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080808",
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brand: {
    marginBottom: 48,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 12,
    color: "#9A9A9A",
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    marginTop: 40,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#D4D4D4",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#121212",
    color: "#FFFFFF",
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  forgotPassword: {
    marginTop: -8,
    color: "#C7A7FF",
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
  },
  registerLink: {
    paddingVertical: 10,
    color: "#C7A7FF",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: "#080808",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
