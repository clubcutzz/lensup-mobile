import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import {
  applyToProject,
  hasAppliedToProject,
} from "../../lib/applyToProject";
import { supabase } from "../../lib/supabase";

type Project = {
  id: string;
  owner_id: string | null;
  title: string | null;
  role: string | null;
  city: string | null;
  event_date: string | null;
  budget: string | number | null;
  description: string | null;
  urgent: boolean | null;
  created_at: string | null;
  city_lat: number | null;
  city_lng: number | null;
};

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

export default function ProjectDetailScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = Boolean(
    user && project && project.owner_id === user.id,
  );

  async function loadProject() {
    if (!projectId) {
      setErrorMessage("No encontramos el identificador del proyecto.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, owner_id, title, role, city, event_date, budget, description, urgent, created_at, city_lat, city_lng",
      )
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Error cargando el proyecto:", error);
      setErrorMessage(
        "No pudimos cargar este proyecto. Puede haber sido eliminado o no estar disponible.",
      );
      setLoading(false);
      return;
    }

    setProject(data as Project);
    setLoading(false);
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    async function checkApplication() {
      if (!user || !projectId) {
        setApplied(false);
        return;
      }

      const alreadyApplied = await hasAppliedToProject(
        projectId,
        user.id,
      );

      setApplied(alreadyApplied);
      setSuccess(alreadyApplied);
    }

    checkApplication();
  }, [projectId, user]);

  async function handleApply() {
    if (!user) {
      Alert.alert(
        "Iniciá sesión",
        "Tenés que iniciar sesión para postularte.",
      );
      return;
    }

    if (!project || isOwner || applied || applying) {
      return;
    }

    setApplying(true);
    setSuccess(false);
    setApplicationMessage(null);

    const result = await applyToProject({
      projectId: project.id,
      projectOwnerId: project.owner_id,
      projectTitle: project.title,
      profileId: user.id,
      notificationLink: "/my-projects",
    });

    setApplying(false);

    if (!result.ok) {
      setApplicationMessage(result.message);
      return;
    }

    setApplied(true);
    setSuccess(true);
    setApplicationMessage(null);

    Alert.alert(
      result.alreadyApplied
        ? "Ya estabas postulado"
        : "¡Postulación enviada!",
      result.alreadyApplied
        ? "Tu postulación a este proyecto ya estaba registrada."
        : "La productora ya puede revisar tu perfil, portfolio y experiencia.",
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Cargando proyecto...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !project) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color="#C9ACFF"
          />
        </View>

        <Text style={styles.errorTitle}>
          No pudimos abrir el proyecto
        </Text>

        <Text style={styles.errorText}>
          {errorMessage ?? "El proyecto no está disponible."}
        </Text>

        <Pressable style={styles.retryButton} onPress={loadProject}>
          <Text style={styles.retryButtonText}>Volver a intentar</Text>
        </Pressable>

        <Pressable
          style={styles.backTextButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const applyButtonLabel = !user
    ? "Iniciá sesión"
    : isOwner
      ? "Tu proyecto"
      : applying
        ? "Enviando..."
        : applied
          ? "Ya estás postulado"
          : "Postularme";

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

        <Text style={styles.headerBrand}>
          Lens<Text style={styles.headerBrandAccent}>UP</Text>
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar proyecto"
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />

          <View style={styles.heroIcon}>
            <Ionicons name="videocam" size={38} color="#FFFFFF" />
          </View>

          {project.urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={12} color="#FF7586" />
              <Text style={styles.urgentText}>URGENTE</Text>
            </View>
          )}
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.role}>
            {project.role?.trim() || "ROL A DEFINIR"}
          </Text>

          <Text style={styles.title}>
            {project.title?.trim() || "Proyecto sin título"}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <Ionicons
                name="location-outline"
                size={17}
                color="#99999E"
              />
              <Text style={styles.metadataText}>
                {project.city?.trim() || "Ubicación a coordinar"}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <Ionicons
                name="calendar-outline"
                size={17}
                color="#99999E"
              />
              <Text style={styles.metadataText}>
                {formatDate(project.event_date)}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="wallet-outline"
                size={22}
                color="#C7A7FF"
              />
            </View>

            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Presupuesto</Text>
              <Text style={styles.budget}>
                {formatBudget(project.budget)}
              </Text>
            </View>
          </View>

          {isOwner && (
            <View style={styles.ownerNotice}>
              <Text style={styles.ownerNoticeText}>
                👑 Este proyecto fue publicado por vos
              </Text>
            </View>
          )}

          {success && !isOwner && (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>
                ✅ ¡Te postulaste con éxito!
              </Text>
              <Text style={styles.successText}>
                La productora podrá revisar tu perfil, portfolio y
                experiencia.
              </Text>
            </View>
          )}

          {applicationMessage && (
            <View style={styles.applicationErrorBox}>
              <Text style={styles.applicationErrorText}>
                {applicationMessage}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>
              SOBRE EL PROYECTO
            </Text>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>
              {project.description?.trim() ||
                "La persona que publicó este proyecto todavía no agregó una descripción."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>LENSUP MATCH</Text>
            <Text style={styles.sectionTitle}>
              Por qué puede encajar con vos
            </Text>

            <View style={styles.reasons}>
              <Reason text="La oportunidad está disponible en tu zona" />
              <Reason text="El rol coincide con perfiles audiovisuales" />
              <Reason text="Podés postularte directamente desde LensUP" />
            </View>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="navigate" size={21} color="#D0B7FF" />
            </View>

            <View style={styles.locationBody}>
              <Text style={styles.locationLabel}>Ubicación</Text>
              <Text style={styles.locationValue}>
                {project.city?.trim() || "A coordinar"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#737378"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBudgetContainer}>
          <Text style={styles.bottomLabel}>Presupuesto</Text>
          <Text style={styles.bottomBudget} numberOfLines={2}>
            {formatBudget(project.budget)}
          </Text>
        </View>

        <Pressable
          disabled={applying || applied || isOwner}
          onPress={handleApply}
          style={({ pressed }) => [
            styles.applyButton,
            applied && styles.appliedButton,
            isOwner && styles.ownerButton,
            (applying || applied || isOwner) && styles.disabledButton,
            pressed && !applying && !applied && !isOwner && styles.pressed,
          ]}
        >
          <Text style={styles.applyButtonText}>
            {applyButtonLabel}
          </Text>

          {!applying && !applied && !isOwner && (
            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <View style={styles.reason}>
      <View style={styles.check}>
        <Ionicons name="checkmark" size={12} color="#090909" />
      </View>
      <Text style={styles.reasonText}>{text}</Text>
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
  errorIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#44315E",
    borderRadius: 21,
    backgroundColor: "#191120",
  },
  errorTitle: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  errorText: {
    maxWidth: 420,
    marginTop: 10,
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 22,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: "#712BE3",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  backTextButton: {
    marginTop: 16,
    padding: 10,
  },
  backText: {
    color: "#A88AE0",
    fontSize: 14,
    fontWeight: "700",
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
  headerBrand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerBrandAccent: {
    color: "#9A5CFF",
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 140,
  },
  hero: {
    height: 250,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#292331",
    borderRadius: 28,
    backgroundColor: "#101012",
  },
  glowLarge: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "#5521A7",
    opacity: 0.38,
    transform: [{ translateX: 90 }, { translateY: -50 }],
  },
  glowSmall: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#9A4DFF",
    opacity: 0.24,
    transform: [{ translateX: -95 }, { translateY: 80 }],
  },
  heroIcon: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7651A8",
    borderRadius: 28,
    backgroundColor: "rgba(12, 12, 14, 0.78)",
  },
  urgentBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#7F2430",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#331419",
  },
  urgentText: {
    color: "#FF7586",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  mainContent: {
    paddingTop: 26,
  },
  role: {
    color: "#A77BFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -1,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 18,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metadataText: {
    color: "#9B9B9F",
    fontSize: 14,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#30283A",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#151218",
  },
  infoIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#261B35",
  },
  infoBody: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    color: "#85858A",
    fontSize: 12,
    fontWeight: "600",
  },
  budget: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
  },
  ownerNotice: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#5A3F79",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#251833",
  },
  ownerNoticeText: {
    color: "#DCCBFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  successBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#28633F",
    borderRadius: 16,
    padding: 15,
    backgroundColor: "#102419",
  },
  successTitle: {
    color: "#C7F8D8",
    fontSize: 14,
    fontWeight: "800",
  },
  successText: {
    marginTop: 6,
    color: "#95CBA8",
    fontSize: 13,
    lineHeight: 19,
  },
  applicationErrorBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#6D3039",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#291317",
  },
  applicationErrorText: {
    color: "#FFB7C0",
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    marginTop: 34,
  },
  sectionEyebrow: {
    color: "#8F68D0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  description: {
    marginTop: 13,
    color: "#A0A0A5",
    fontSize: 15,
    lineHeight: 24,
  },
  reasons: {
    gap: 12,
    marginTop: 17,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 21,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#A676FF",
  },
  reasonText: {
    flex: 1,
    color: "#B0B0B5",
    fontSize: 14,
    lineHeight: 20,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 34,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 20,
    padding: 17,
    backgroundColor: "#121214",
  },
  locationIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#251A34",
  },
  locationBody: {
    flex: 1,
    marginLeft: 13,
  },
  locationLabel: {
    color: "#77777C",
    fontSize: 11,
    fontWeight: "600",
  },
  locationValue: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  bottomBar: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: "#242427",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 26 : 16,
    backgroundColor: "rgba(10, 10, 10, 0.98)",
  },
  bottomBudgetContainer: {
    flex: 1,
  },
  bottomLabel: {
    color: "#737378",
    fontSize: 10,
    fontWeight: "600",
  },
  bottomBudget: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  applyButton: {
    minWidth: 160,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    paddingHorizontal: 22,
    backgroundColor: "#712BE3",
  },
  appliedButton: {
    backgroundColor: "#169B62",
  },
  ownerButton: {
    backgroundColor: "#473554",
  },
  disabledButton: {
    opacity: 0.82,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
