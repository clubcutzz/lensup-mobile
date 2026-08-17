import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
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

type ApplicationSummary = {
  id: string;
  profile_id: string;
};

type Project = {
  id: string;
  title: string | null;
  role: string | null;
  city: string | null;
  event_date: string | null;
  budget: string | number | null;
  urgent: boolean | null;
  created_at: string | null;
  applications: ApplicationSummary[];
};

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

export default function MyProjectsScreen() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProjects = useCallback(
    async (showInitialLoader = false) => {
      if (!user) {
        setProjects([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showInitialLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select(
          "id, title, role, city, event_date, budget, urgent, created_at",
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Error cargando proyectos:", projectsError);
        setErrorMessage("No pudimos cargar tus proyectos.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const baseProjects = projectRows ?? [];
      const projectIds = baseProjects.map((project) => project.id);

      if (projectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: applications, error: applicationsError } = await supabase
        .from("applications")
        .select("id, project_id, profile_id")
        .in("project_id", projectIds);

      if (applicationsError) {
        console.error(
          "Error cargando postulaciones:",
          applicationsError,
        );
      }

      const projectsWithApplications: Project[] = baseProjects.map(
        (project) => ({
          ...project,
          applications: (applications ?? [])
            .filter((application) => application.project_id === project.id)
            .map((application) => ({
              id: application.id,
              profile_id: application.profile_id,
            })),
        }),
      );

      setProjects(projectsWithApplications);
      setLoading(false);
      setRefreshing(false);
    },
    [user],
  );

  useEffect(() => {
    loadProjects(true);
  }, [loadProjects]);

  function handleRefresh() {
    setRefreshing(true);
    loadProjects();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Cargando tus proyectos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Mis proyectos</Text>
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
          <Text style={styles.eyebrow}>MIS PROYECTOS</Text>
          <Text style={styles.title}>Proyectos publicados por vos.</Text>
          <Text style={styles.subtitle}>
            Revisá tus publicaciones y consultá quiénes se postularon.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={26}
              color="#D9B8FF"
            />
            <Text style={styles.messageTitle}>No pudimos cargar tus proyectos</Text>
            <Text style={styles.messageText}>{errorMessage}</Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => loadProjects(true)}
            >
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="briefcase-outline"
              size={30}
              color="#D0B7FF"
            />
            <Text style={styles.messageTitle}>
              Todavía no publicaste proyectos
            </Text>
            <Text style={styles.messageText}>
              Creá tu primera oportunidad desde la app y revisá acá sus
              postulantes.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/publish" as Href)}
            >
              <Text style={styles.primaryButtonText}>Publicar proyecto</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cards}>
            {projects.map((project) => {
              const count = project.applications.length;

              return (
                <Pressable
                  key={project.id}
                  onPress={() =>
                    router.push({
                      pathname: "/my-projects/[id]",
                      params: { id: project.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.badges}>
                      {project.urgent && (
                        <View style={styles.urgentBadge}>
                          <Ionicons
                            name="flash"
                            size={12}
                            color="#FF7586"
                          />
                          <Text style={styles.urgentBadgeText}>URGENTE</Text>
                        </View>
                      )}

                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                          {project.role?.trim() || "ROL A DEFINIR"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.arrowButton}>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>
                    {project.title?.trim() || "Proyecto sin título"}
                  </Text>

                  <View style={styles.metadata}>
                    <MetadataItem
                      icon="location-outline"
                      text={project.city?.trim() || "Sin ciudad"}
                    />
                    <MetadataItem
                      icon="calendar-outline"
                      text={formatDate(project.event_date)}
                    />
                  </View>

                  <Text style={styles.budget}>
                    {formatBudget(project.budget)}
                  </Text>

                  <View style={styles.divider} />

                  <View style={styles.applicantsRow}>
                    <View style={styles.applicantsIcon}>
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color="#C7A7FF"
                      />
                    </View>

                    <View style={styles.applicantsInfo}>
                      <Text style={styles.applicantsCount}>
                        {count} {count === 1 ? "postulante" : "postulantes"}
                      </Text>
                      <Text style={styles.applicantsHint}>
                        Tocá para revisar candidatos
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#77777C"
                    />
                  </View>
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
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  badges: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  roleBadge: {
    borderWidth: 1,
    borderColor: "#513878",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#241833",
  },
  roleBadgeText: {
    color: "#D6C0FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  arrowButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#712BE3",
  },
  cardTitle: {
    marginTop: 20,
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 15,
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
  budget: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: "#29292C",
  },
  applicantsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  applicantsIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#251A34",
  },
  applicantsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  applicantsCount: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  applicantsHint: {
    marginTop: 3,
    color: "#77777C",
    fontSize: 12,
  },
  messageBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 42,
    backgroundColor: "#101012",
  },
  messageTitle: {
    marginTop: 16,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  messageText: {
    maxWidth: 400,
    marginTop: 10,
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 13,
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
