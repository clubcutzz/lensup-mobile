import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Project = {
  id: string;
  title: string | null;
  role: string | null;
  city: string | null;
  event_date: string | null;
  budget: string | number | null;
  description: string | null;
  urgent: boolean | null;
};

type Application = {
  id: string;
  created_at: string;
  projects: Project | Project[] | null;
};

function getProject(application: Application): Project | null {
  if (Array.isArray(application.projects)) {
    return application.projects[0] ?? null;
  }

  return application.projects;
}

function formatDate(value: string | null) {
  if (!value) return "Fecha a definir";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatBudget(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "Presupuesto a definir";
  }

  if (value === "A convenir") {
    return "A convenir";
  }

  if (typeof value === "string" && value.includes(":")) {
    const [currency, amount] = value.split(":");
    const numericAmount = Number(amount);

    if (!Number.isNaN(numericAmount)) {
      if (currency === "UYU") {
        return `$U ${numericAmount.toLocaleString("es-UY")}`;
      }

      if (currency === "USD") {
        return `US$ ${numericAmount.toLocaleString("en-US")}`;
      }
    }
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

function formatAppliedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Postulación enviada";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Postulado recién";
  if (diffMinutes < 60) return `Postulado hace ${diffMinutes} min`;
  if (diffHours < 24) {
    return `Postulado hace ${diffHours} ${
      diffHours === 1 ? "hora" : "horas"
    }`;
  }

  if (diffDays < 7) {
    return `Postulado hace ${diffDays} ${
      diffDays === 1 ? "día" : "días"
    }`;
  }

  return `Postulado el ${new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "short",
  }).format(date)}`;
}

export default function MyApplicationsScreen() {
  const { user } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadApplications = useCallback(
    async (showInitialLoader = false) => {
      if (!user) {
        setApplications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showInitialLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          created_at,
          projects (
            id,
            title,
            role,
            city,
            event_date,
            budget,
            description,
            urgent
          )
        `)
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando postulaciones:", error);

        setErrorMessage(
          "No pudimos cargar tus postulaciones. Deslizá hacia abajo para volver a intentar.",
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setApplications((data ?? []) as Application[]);
      setLoading(false);
      setRefreshing(false);
    },
    [user],
  );

  useEffect(() => {
    loadApplications(true);
  }, [loadApplications]);

  function handleRefresh() {
    setRefreshing(true);
    loadApplications();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>
          Cargando tus postulaciones...
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="person-outline"
            size={30}
            color="#C9ACFF"
          />
        </View>

        <Text style={styles.emptyTitle}>Tenés que iniciar sesión</Text>

        <Text style={styles.emptyText}>
          Iniciá sesión para ver los proyectos a los que te postulaste.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Mis postulaciones</Text>

        <View style={styles.headerPlaceholder} />
      </View>

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
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>MIS POSTULACIONES</Text>

          <Text style={styles.title}>
            Proyectos a los que te postulaste.
          </Text>

          <Text style={styles.subtitle}>
            Seguí tus oportunidades y volvé a consultar los detalles de cada
            proyecto.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={24}
              color="#D9B8FF"
            />

            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadApplications(true)}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : applications.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="paper-plane-outline"
                size={30}
                color="#C9ACFF"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Todavía no te postulaste
            </Text>

            <Text style={styles.emptyText}>
              Cuando te postules a un proyecto, aparecerá acá
              automáticamente.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.primaryButtonText}>
                Explorar oportunidades
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cards}>
            {applications.map((application) => {
              const project = getProject(application);

              return (
                <Pressable
                  key={application.id}
                  disabled={!project?.id}
                  onPress={() => {
                    if (!project?.id) return;

                    router.push({
                      pathname: "/project/[id]",
                      params: { id: project.id },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && project?.id && styles.cardPressed,
                  ]}
                >
                  <View style={styles.badges}>
                    <View style={styles.appliedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color="#9AF0B9"
                      />
                      <Text style={styles.appliedBadgeText}>POSTULADO</Text>
                    </View>

                    {project?.urgent && (
                      <View style={styles.urgentBadge}>
                        <Ionicons
                          name="flash"
                          size={12}
                          color="#FF7586"
                        />
                        <Text style={styles.urgentBadgeText}>URGENTE</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.role}>
                    {project?.role?.trim() || "ROL A DEFINIR"}
                  </Text>

                  <Text style={styles.cardTitle}>
                    {project?.title?.trim() || "Proyecto eliminado"}
                  </Text>

                  <View style={styles.metadata}>
                    <MetadataItem
                      icon="location-outline"
                      text={project?.city?.trim() || "Sin ciudad"}
                    />

                    <MetadataItem
                      icon="calendar-outline"
                      text={formatDate(project?.event_date ?? null)}
                    />
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.budgetContainer}>
                      <Text style={styles.budgetLabel}>Presupuesto</Text>
                      <Text style={styles.budget} numberOfLines={2}>
                        {formatBudget(project?.budget ?? null)}
                      </Text>
                    </View>

                    {project?.id ? (
                      <View style={styles.arrowButton}>
                        <Ionicons
                          name="arrow-forward"
                          size={19}
                          color="#FFFFFF"
                        />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.appliedAt}>
                    {formatAppliedAt(application.created_at)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetadataItem({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.metadataItem}>
      <Ionicons name={icon} size={15} color="#8E8E93" />
      <Text style={styles.metadataText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080808",
  },
  centeredScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#080808",
  },
  loadingText: {
    marginTop: 14,
    color: "#8E8E93",
    fontSize: 14,
  },
  header: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 22 : 8,
    paddingBottom: 12,
    backgroundColor: "#080808",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 15,
    backgroundColor: "#121214",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  intro: {
    paddingTop: 24,
    paddingBottom: 30,
  },
  eyebrow: {
    color: "#A77BFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.25,
  },
  title: {
    maxWidth: 600,
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -1,
  },
  subtitle: {
    maxWidth: 540,
    marginTop: 12,
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#121214",
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  appliedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#28633F",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#102419",
  },
  appliedBadgeText: {
    color: "#B9F3CC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#7F2430",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#331419",
  },
  urgentBadgeText: {
    color: "#FF7586",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  role: {
    marginTop: 18,
    color: "#A77BFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  cardTitle: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 29,
    letterSpacing: -0.5,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 16,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metadataText: {
    color: "#99999E",
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 22,
  },
  budgetContainer: {
    flex: 1,
  },
  budgetLabel: {
    color: "#77777C",
    fontSize: 11,
    fontWeight: "600",
  },
  budget: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  arrowButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#712BE3",
  },
  divider: {
    height: 1,
    marginTop: 18,
    backgroundColor: "#29292C",
  },
  appliedAt: {
    marginTop: 13,
    color: "#77777C",
    fontSize: 12,
  },
  errorBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#45305F",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 30,
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
    paddingVertical: 11,
    backgroundColor: "#7C42D8",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 42,
    backgroundColor: "#101012",
  },
  emptyIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#44315E",
    borderRadius: 21,
    backgroundColor: "#191120",
  },
  emptyTitle: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    maxWidth: 400,
    marginTop: 10,
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 22,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#712BE3",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
