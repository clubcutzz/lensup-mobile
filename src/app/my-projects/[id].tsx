import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  whatsapp: string | null;
  roles: string[] | string | null;
  kit: string[] | string | null;
  software: string[] | string | null;
  is_available: boolean | null;
  urgent_available: boolean | null;
  has_transport: boolean | null;
};

type Application = {
  id: string;
  created_at: string;
  project_id: string;
  profile_id: string;
  profile?: Profile;
};

type Project = {
  id: string;
  owner_id: string;
  title: string | null;
  role: string | null;
  city: string | null;
};

function formatList(value: string[] | string | null | undefined) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export default function ProjectApplicantsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(
    async (showInitialLoader = false) => {
      if (!user || !projectId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showInitialLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      const { data: projectRow, error: projectError } = await supabase
        .from("projects")
        .select("id, owner_id, title, role, city")
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .single();

      if (projectError) {
        console.error("Error cargando proyecto:", projectError);
        setErrorMessage(
          "No pudimos abrir este proyecto o no te pertenece.",
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: applicationRows, error: applicationsError } =
        await supabase
          .from("applications")
          .select("id, created_at, project_id, profile_id")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

      if (applicationsError) {
        console.error(
          "Error cargando postulantes:",
          applicationsError,
        );
        setErrorMessage("No pudimos cargar los postulantes.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const profileIds = [
        ...new Set(
          (applicationRows ?? []).map(
            (application) => application.profile_id,
          ),
        ),
      ];

      let profiles: Profile[] = [];

      if (profileIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, city, whatsapp, roles, kit, software, is_available, urgent_available, has_transport",
          )
          .in("id", profileIds);

        if (profilesError) {
          console.error("Error cargando perfiles:", profilesError);
        } else {
          profiles = (profileRows ?? []) as Profile[];
        }
      }

      const hydratedApplications = (applicationRows ?? []).map(
        (application) => ({
          ...application,
          profile: profiles.find(
            (profile) => profile.id === application.profile_id,
          ),
        }),
      );

      setProject(projectRow as Project);
      setApplications(hydratedApplications as Application[]);
      setLoading(false);
      setRefreshing(false);
    },
    [projectId, user],
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Cargando postulantes...</Text>
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

        <Text style={styles.headerTitle}>Postulantes</Text>
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
        {errorMessage || !project ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color="#D0B7FF"
            />
            <Text style={styles.messageTitle}>
              No pudimos abrir el proyecto
            </Text>
            <Text style={styles.messageText}>
              {errorMessage || "El proyecto no está disponible."}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>
                {project.role?.trim() || "PROYECTO"}
              </Text>
              <Text style={styles.title}>
                {project.title?.trim() || "Proyecto sin título"}
              </Text>
              <Text style={styles.subtitle}>
                {applications.length}{" "}
                {applications.length === 1
                  ? "profesional se postuló"
                  : "profesionales se postularon"}
              </Text>
            </View>

            {applications.length === 0 ? (
              <View style={styles.messageBox}>
                <Ionicons
                  name="people-outline"
                  size={30}
                  color="#D0B7FF"
                />
                <Text style={styles.messageTitle}>
                  Todavía no hay postulantes
                </Text>
                <Text style={styles.messageText}>
                  Cuando alguien se postule, su perfil aparecerá acá.
                </Text>
              </View>
            ) : (
              <View style={styles.cards}>
                {applications.map((application) => (
                  <ApplicantCard
                    key={application.id}
                    application={application}
                    project={project}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ApplicantCard({
  application,
  project,
}: {
  application: Application;
  project: Project;
}) {
  const profile = application.profile;
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const roles = formatList(profile?.roles);
  const kit = formatList(profile?.kit);
  const software = formatList(profile?.software);

  async function handleAcceptApplicant() {
    if (!profile?.id || accepted || accepting) return;

    setAccepting(true);

    const { error } = await supabase.from("notifications").insert({
      user_id: profile.id,
      title: "🎉 Fuiste seleccionado",
      message: `Te seleccionaron para "${project.title || "un proyecto"}".`,
      type: "accepted",
      link: "/my-applications",
    });

    setAccepting(false);

    if (error) {
      Alert.alert(
        "No pudimos seleccionar al postulante",
        error.message,
      );
      return;
    }

    setAccepted(true);

    Alert.alert(
      "Postulante seleccionado",
      "El profesional recibió una notificación.",
    );
  }

  async function handleWhatsApp() {
    if (!profile?.whatsapp) return;

    const phone = cleanPhone(profile.whatsapp);
    const url = `https://wa.me/${phone}`;
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert(
        "No pudimos abrir WhatsApp",
        "Revisá el número guardado en el perfil.",
      );
      return;
    }

    await Linking.openURL(url);
  }

  return (
    <View style={styles.applicantCard}>
      <View style={styles.applicantHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name
              ?.split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((name) => name[0]?.toUpperCase())
              .join("") || "LU"}
          </Text>
        </View>

        <View style={styles.applicantInfo}>
          <Text style={styles.applicantName}>
            {profile?.full_name || "Profesional sin nombre"}
          </Text>

          <View style={styles.cityRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color="#8E8E93"
            />
            <Text style={styles.cityText}>
              {profile?.city || "Sin ciudad"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.badges}>
        {profile?.is_available && (
          <Badge label="Disponible" variant="green" />
        )}
        {profile?.urgent_available && (
          <Badge label="Urgencias" variant="red" />
        )}
        {profile?.has_transport && (
          <Badge label="Locomoción" variant="violet" />
        )}
      </View>

      {roles.length > 0 && (
        <View style={styles.roles}>
          {roles.slice(0, 4).map((role) => (
            <View key={role} style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role}</Text>
            </View>
          ))}
        </View>
      )}

      {kit.length > 0 && (
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Kit: </Text>
          {kit.slice(0, 3).join(" · ")}
        </Text>
      )}

      {software.length > 0 && (
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Software: </Text>
          {software.slice(0, 3).join(" · ")}
        </Text>
      )}

      <View style={styles.actions}>
        {profile?.id && (
          <Pressable
            onPress={() =>
              Alert.alert(
                "Perfil profesional",
                "La pantalla completa del profesional será el próximo paso.",
              )
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Ver perfil</Text>
          </Pressable>
        )}

        {profile?.whatsapp && (
          <Pressable
            onPress={handleWhatsApp}
            style={({ pressed }) => [
              styles.whatsappButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <Pressable
        disabled={accepting || accepted}
        onPress={handleAcceptApplicant}
        style={({ pressed }) => [
          styles.acceptButton,
          accepted && styles.acceptedButton,
          (accepting || accepted) && styles.disabledButton,
          pressed && !accepting && !accepted && styles.pressed,
        ]}
      >
        {accepting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={accepted ? "checkmark-circle" : "person-add-outline"}
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.acceptButtonText}>
              {accepted ? "Seleccionado" : "Aceptar postulante"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function Badge({
  label,
  variant,
}: {
  label: string;
  variant: "green" | "red" | "violet";
}) {
  return (
    <View
      style={[
        styles.badge,
        variant === "green" && styles.badgeGreen,
        variant === "red" && styles.badgeRed,
        variant === "violet" && styles.badgeViolet,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          variant === "green" && styles.badgeTextGreen,
          variant === "red" && styles.badgeTextRed,
          variant === "violet" && styles.badgeTextViolet,
        ]}
      >
        {label}
      </Text>
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
    letterSpacing: 1.2,
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
    marginTop: 10,
    color: "#8E8E93",
    fontSize: 15,
  },
  cards: {
    gap: 16,
  },
  applicantCard: {
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#121214",
  },
  applicantHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#5C3C83",
    borderRadius: 20,
    backgroundColor: "#251637",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  applicantInfo: {
    flex: 1,
    marginLeft: 13,
  },
  applicantName: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  cityText: {
    color: "#8E8E93",
    fontSize: 13,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 17,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeGreen: {
    borderColor: "#28633F",
    backgroundColor: "#102419",
  },
  badgeRed: {
    borderColor: "#7F2430",
    backgroundColor: "#331419",
  },
  badgeViolet: {
    borderColor: "#513878",
    backgroundColor: "#241833",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeTextGreen: {
    color: "#B9F3CC",
  },
  badgeTextRed: {
    color: "#FF7586",
  },
  badgeTextViolet: {
    color: "#D6C0FF",
  },
  roles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#1C1722",
  },
  roleBadgeText: {
    color: "#BCA5E8",
    fontSize: 11,
    fontWeight: "700",
  },
  detailText: {
    marginTop: 13,
    color: "#85858A",
    fontSize: 13,
    lineHeight: 19,
  },
  detailLabel: {
    color: "#C0C0C4",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#353539",
    borderRadius: 15,
    backgroundColor: "#19191B",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  whatsappButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#20A75A",
  },
  acceptButton: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: "#712BE3",
  },
  acceptedButton: {
    backgroundColor: "#169B62",
  },
  disabledButton: {
    opacity: 0.82,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
