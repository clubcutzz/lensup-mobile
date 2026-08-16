import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { OpportunityCard } from "../../components/OpportunityCard";
import { useAuth } from "../../context/AuthContext";
import type { Opportunity } from "../../data/opportunities";
import { supabase } from "../../lib/supabase";

type ProjectRow = {
  id: string;
  title: string | null;
  role: string | null;
  city: string | null;
  event_date: string | null;
  budget: string | number | null;
  description: string | null;
  urgent: boolean | null;
  created_at: string | null;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";

  return "Buenas noches";
}

function formatDate(value: string | null) {
  if (!value) return "Fecha a coordinar";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatBudget(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "A convenir";
  }

  const normalized =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));

  if (!Number.isNaN(normalized)) {
    return `UYU ${new Intl.NumberFormat("es-UY", {
      maximumFractionDigits: 0,
    }).format(normalized)}`;
  }

  return String(value);
}

function mapProjectToOpportunity(project: ProjectRow): Opportunity {
  return {
    id: project.id,
    title: project.title?.trim() || "Proyecto sin título",
    category: project.role?.trim() || "Rol a definir",
    location: project.city?.trim() || "Ubicación a coordinar",
    date: formatDate(project.event_date),
    budget: formatBudget(project.budget),
    durationHours: 0,
    urgent: Boolean(project.urgent),
    client: "Cliente LensUP",
    description:
      project.description?.trim() || "Abrí la oportunidad para ver todos los detalles.",
    match: 90,
    reasons: [
      "Coincide con tu ubicación",
      "Es compatible con tu perfil",
      "Oportunidad publicada recientemente",
    ],
    tags: (project.role || "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean),
  };
}

export default function HomeScreen() {
  const { user } = useAuth();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const loadUnreadNotifications = useCallback(async () => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error cargando notificaciones:", error);
      return;
    }

    setUnreadNotifications(count ?? 0);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotifications();
    }, [loadUnreadNotifications]),
  );

  // El contador se actualiza cada vez que Home recupera el foco.
  // Evitamos crear un canal Realtime local para no duplicar suscripciones
  // cuando Expo Router monta la pantalla más de una vez en desarrollo.

  const firstName = useMemo(() => {
    const metadataName = user?.user_metadata?.full_name;

    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim().split(" ")[0];
    }

    return "Nico";
  }, [user]);

  async function loadProjects(showInitialLoader = false) {
    if (showInitialLoader) {
      setLoading(true);
    }

    setErrorMessage(null);

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, title, role, city, event_date, budget, description, urgent, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando proyectos:", error);
      setErrorMessage(
        "No pudimos cargar las oportunidades. Deslizá hacia abajo para volver a intentar.",
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const mappedProjects = ((data ?? []) as ProjectRow[]).map(
      mapProjectToOpportunity,
    );

    setOpportunities(mappedProjects);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadProjects(true);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadProjects();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Buscando oportunidades...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#9A5CFF"
            colors={["#9A5CFF"]}
          />
        }
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            Lens<Text style={styles.brandAccent}>UP</Text>
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir notificaciones"
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [
              styles.notificationButton,
              pressed && styles.notificationButtonPressed,
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#FFFFFF"
            />

            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.greeting}>
            {getGreeting()}, {firstName} 👋
          </Text>

          <View style={styles.availability}>
            <View style={styles.availabilityDot} />
            <Text style={styles.availabilityText}>Disponible ahora</Text>
            <Ionicons name="chevron-down" size={13} color="#97979C" />
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            Encontramos{" "}
            <Text style={styles.summaryAccent}>
              {opportunities.length}{" "}
              {opportunities.length === 1
                ? "oportunidad"
                : "oportunidades"}
            </Text>{" "}
            para vos.
          </Text>

          <Text style={styles.summarySubtitle}>
            Seleccionadas según tu perfil, equipamiento y disponibilidad.
          </Text>
        </View>

        <View style={styles.filters}>
          <Pressable style={[styles.filter, styles.filterActive]}>
            <Text style={styles.filterActiveText}>Para vos</Text>
          </Pressable>

          <Pressable style={styles.filter}>
            <Text style={styles.filterText}>Recientes</Text>
          </Pressable>

          <Pressable style={styles.filter}>
            <Text style={styles.filterText}>Guardados</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={23}
              color="#D9B8FF"
            />
            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadProjects(true)}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : opportunities.length > 0 ? (
          <>
            <View style={styles.cards}>
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onPress={() => {
                    router.push({
                      pathname: "/project/[id]",
                      params: { id: opportunity.id },
                    });
                  }}
                />
              ))}
            </View>

            <View style={styles.endMessage}>
              <Ionicons
                name="aperture-outline"
                size={24}
                color="#7550A9"
              />
              <Text style={styles.endTitle}>Estás al día</Text>
              <Text style={styles.endText}>
                Te avisaremos cuando aparezca una nueva oportunidad para tu
                perfil.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="briefcase-outline"
              size={30}
              color="#8D63C7"
            />
            <Text style={styles.emptyTitle}>
              Todavía no hay oportunidades
            </Text>
            <Text style={styles.emptyText}>
              Cuando se publique un proyecto en LensUP aparecerá acá
              automáticamente.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080808",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080808",
  },
  loadingText: {
    marginTop: 14,
    color: "#8E8E93",
    fontSize: 14,
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 28 : 10,
    paddingBottom: 130,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  brandAccent: {
    color: "#9A5CFF",
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 15,
    backgroundColor: "#121214",
  },
  notificationButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#080808",
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: "#A35CFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  welcome: {
    marginTop: 42,
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  availability: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#111113",
  },
  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  availabilityText: {
    color: "#B9B9BD",
    fontSize: 12,
    fontWeight: "600",
  },
  summary: {
    marginTop: 34,
  },
  summaryTitle: {
    maxWidth: 520,
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 37,
    letterSpacing: -1,
  },
  summaryAccent: {
    color: "#A775FF",
  },
  summarySubtitle: {
    maxWidth: 520,
    marginTop: 12,
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginTop: 28,
    marginBottom: 18,
  },
  filter: {
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: "#101012",
  },
  filterActive: {
    borderColor: "#633CAA",
    backgroundColor: "#251838",
  },
  filterText: {
    color: "#8D8D92",
    fontSize: 12,
    fontWeight: "600",
  },
  filterActiveText: {
    color: "#D8C6FF",
    fontSize: 12,
    fontWeight: "700",
  },
  cards: {
    gap: 18,
  },
  errorBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#45305F",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "#15101C",
  },
  errorText: {
    maxWidth: 420,
    marginTop: 12,
    color: "#BEB5C8",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#7C42D8",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 42,
    backgroundColor: "#101012",
  },
  emptyTitle: {
    marginTop: 14,
    color: "#D0D0D3",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    maxWidth: 400,
    marginTop: 8,
    color: "#77777C",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  endMessage: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  endTitle: {
    marginTop: 12,
    color: "#D0D0D3",
    fontSize: 15,
    fontWeight: "700",
  },
  endText: {
    marginTop: 7,
    color: "#77777C",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
