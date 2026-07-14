import { Link } from "expo-router";
import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function RegisterScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <Link href="/login" style={styles.link}>
        Volver al login
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    backgroundColor: "#080808",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  link: {
    color: "#A3A3A3",
    fontSize: 16,
  },
});