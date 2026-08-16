import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { applyToProject } from "../../lib/applyToProject";
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
  deliverables: string | null;
  reference_links: string | null;
  urgent: boolean | null;
  created_at: string | null;
  city_lat: number | null;
  city_lng: number | null;
  status: "open" | "in_progress" | "completed" | "cancelled" | null;
};

type AcceptedApplication = {
  id: string;
  profile_id: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Review = {
  id: string;
  application_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type ProjectCreator = {
  id: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
};

type ApplicationStatus = "pending" | "accepted" | "rejected";

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


function splitLines(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}


function getProjectIcon(role: string | null): keyof typeof Ionicons.glyphMap {
  const value = (role ?? "").toLowerCase();

  if (value.includes("fotógraf") || value.includes("fotograf")) return "camera";
  if (value.includes("videógraf") || value.includes("videograf") || value.includes("cámara") || value.includes("camara") || value.includes("filmmaker")) return "videocam";
  if (value.includes("editor") || value.includes("edición") || value.includes("edicion") || value.includes("montaj")) return "cut";
  if (value.includes("sonido") || value.includes("sonidista") || value.includes("audio")) return "mic";
  if (value.includes("iluminación") || value.includes("iluminacion") || value.includes("gaffer")) return "bulb";
  if (value.includes("productor") || value.includes("producción") || value.includes("produccion")) return "briefcase";
  if (value.includes("drone") || value.includes("piloto")) return "airplane";
  if (value.includes("stream")) return "radio";
  if (value.includes("diseñ")) return "color-palette";
  if (value.includes("community") || value.includes("contenido") || value.includes("social")) return "phone-portrait";
  return "film";
}

export default function ProjectDetailScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [creator, setCreator] = useState<ProjectCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationStatus, setApplicationStatus] =
    useState<ApplicationStatus | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [acceptedApplications, setAcceptedApplications] = useState<
    AcceptedApplication[]
  >([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCelebration, setReviewCelebration] = useState<{
    review: Review;
    name: string;
    avatarUrl: string | null;
    reviewedId: string;
  } | null>(null);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = Boolean(
    user && project && project.owner_id === user.id,
  );

  const loadProject = useCallback(async () => {
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
        "id, owner_id, title, role, city, event_date, budget, description, deliverables, reference_links, urgent, created_at, city_lat, city_lng, status",
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

    const loadedProject = data as Project;
    setProject(loadedProject);
    if (loadedProject.owner_id) {
      const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select("id, full_name, headline, city, avatar_url, whatsapp")
        .eq("id", loadedProject.owner_id)
        .maybeSingle();

      if (creatorError) {
        console.error("Error cargando al creador del proyecto:", creatorError);
        setCreator(null);
      } else {
        setCreator((creatorData as ProjectCreator | null) ?? null);
      }
    } else {
      setCreator(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    async function checkApplication() {
      if (!user || !projectId) {
        setApplied(false);
        setSuccess(false);
        setApplicationStatus(null);
        setApplicationId(null);
        return;
      }

      const { data, error } = await supabase
        .from("applications")
        .select("id, status")
        .eq("project_id", projectId)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error consultando la postulación:", error);
        setApplied(false);
        setSuccess(false);
        setApplicationStatus(null);
        return;
      }

      const status = (data?.status as ApplicationStatus | null) ?? null;

      setApplied(Boolean(data));
      setSuccess(Boolean(data));
      setApplicationStatus(status);
      setApplicationId(data?.id ?? null);
    }

    checkApplication();
  }, [projectId, user]);

  useEffect(() => {
    async function loadReviewData() {
      if (!user || !projectId || !project) {
        setAcceptedApplications([]);
        setReviews([]);
        return;
      }

      const reviewsPromise = supabase
        .from("reviews")
        .select(
          "id, application_id, reviewer_id, reviewed_id, rating, comment, created_at",
        )
        .eq("project_id", projectId);

      const acceptedPromise =
        project.owner_id === user.id
          ? supabase
              .from("applications")
              .select(`
                id,
                profile_id,
                profile:profiles (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .eq("project_id", projectId)
              .eq("status", "accepted")
          : Promise.resolve({ data: [], error: null });

      const [reviewsResult, acceptedResult] = await Promise.all([
        reviewsPromise,
        acceptedPromise,
      ]);

      if (reviewsResult.error) {
        console.error("Error cargando reseñas:", reviewsResult.error);
      } else {
        setReviews((reviewsResult.data as Review[]) ?? []);
      }

      if (acceptedResult.error) {
        console.error(
          "Error cargando profesionales aceptados:",
          acceptedResult.error,
        );
      } else {
        setAcceptedApplications(
          ((acceptedResult.data ?? []) as unknown as AcceptedApplication[]).map(
            (item) => ({
              ...item,
              profile: Array.isArray(item.profile)
                ? (item.profile[0] ?? null)
                : item.profile,
            }),
          ),
        );
      }
    }

    loadReviewData();
  }, [projectId, project, user]);

  function handleReviewCreated(
    review: Review,
    celebration: {
      name: string;
      avatarUrl: string | null;
      reviewedId: string;
    },
  ) {
    setReviews((current) => [...current, review]);
    setReviewCelebration({ review, ...celebration });
  }

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
    setApplicationStatus("pending");
    setApplicationMessage(null);

    const { data: createdApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("project_id", project.id)
      .eq("profile_id", user.id)
      .maybeSingle();

    setApplicationId(createdApplication?.id ?? null);

    Alert.alert(
      result.alreadyApplied
        ? "Ya estabas postulado"
        : "¡Postulación enviada!",
      result.alreadyApplied
        ? "Tu postulación a este proyecto ya estaba registrada."
        : "La productora ya puede revisar tu perfil, portfolio y experiencia.",
    );
  }

  async function handleContactCreator() {
    if (applicationStatus !== "accepted" || !creator?.whatsapp) {
      return;
    }

    const phone = creator.whatsapp.replace(/\D/g, "");

    if (!phone) {
      Alert.alert(
        "Número no disponible",
        "El creador todavía no configuró correctamente su WhatsApp.",
      );
      return;
    }

    const message = encodeURIComponent(
      `Hola ${creator.full_name?.trim() || ""}, soy el profesional que seleccionaste en LensUP para "${project?.title?.trim() || "tu proyecto"}".`,
    );

    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);

    if (!canOpen) {
      Alert.alert(
        "No pudimos abrir WhatsApp",
        "Revisá que WhatsApp esté instalado y que el número sea válido.",
      );
      return;
    }

    await Linking.openURL(whatsappUrl);
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

  const projectRoles =
    project.role
      ?.split(",")
      .map((role) => role.trim())
      .filter(Boolean) ?? [];

  const visibleProjectRoles =
    projectRoles.length > 0 ? projectRoles : ["Profesional audiovisual"];

  const deliverables = splitLines(project.deliverables);
  const references = splitLines(project.reference_links);

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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir al inicio"
          onPress={() => router.replace("/")}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.headerBrand}>
            Lens<Text style={styles.headerBrandAccent}>UP</Text>
          </Text>
        </Pressable>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />

          <View style={styles.heroRoles}>
            {visibleProjectRoles.map((role, index) => (
              <View
                key={`${role}-${index}`}
                style={styles.heroRoleItem}
              >
                <View style={styles.heroIcon}>
                  <Ionicons
                    name={getProjectIcon(role)}
                    size={visibleProjectRoles.length > 3 ? 27 : 32}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={styles.heroRoleLabel}
                  numberOfLines={2}
                >
                  {role}
                </Text>
              </View>
            ))}
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

          <View style={styles.creatorCard}>
            {creator?.avatar_url ? (
              <Image
                source={{ uri: creator.avatar_url }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={styles.creatorIcon}>
                <Ionicons
                  name="person-outline"
                  size={23}
                  color="#D0B7FF"
                />
              </View>
            )}

            <View style={styles.creatorBody}>
              <Text style={styles.creatorLabel}>Publicado por</Text>

              <Text style={styles.creatorName}>
                {creator?.full_name?.trim() || "Usuario de LensUP"}
              </Text>

              {(creator?.headline || creator?.city) && (
                <Text style={styles.creatorMeta}>
                  {[creator?.headline?.trim(), creator?.city?.trim()]
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
              )}
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

          {applicationStatus === "accepted" && !isOwner && (
            <View style={styles.acceptedContactBox}>
              <View style={styles.acceptedContactIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={25}
                  color="#8BE4B7"
                />
              </View>

              <View style={styles.acceptedContactBody}>
                <Text style={styles.acceptedContactTitle}>
                  ¡Fuiste seleccionado!
                </Text>
                <Text style={styles.acceptedContactText}>
                  Ya podés comunicarte con quien publicó este proyecto.
                </Text>
              </View>
            </View>
          )}

          {project.status === "completed" &&
            isOwner &&
            acceptedApplications.map((acceptedApplication) => {
              const existingReview = reviews.find(
                (review) =>
                  review.application_id === acceptedApplication.id &&
                  review.reviewer_id === user?.id,
              );

              return (
                <MobileReviewPanel
                  key={acceptedApplication.id}
                  title="¿Cómo fue trabajar juntos?"
                  name={
                    acceptedApplication.profile?.full_name?.trim() ||
                    "Profesional seleccionado"
                  }
                  avatarUrl={acceptedApplication.profile?.avatar_url ?? null}
                  applicationId={acceptedApplication.id}
                  projectId={project.id}
                  reviewerId={user!.id}
                  reviewedId={acceptedApplication.profile_id}
                  reviewerRole="creator"
                  existingReview={existingReview}
                  onCreated={handleReviewCreated}
                />
              );
            })}

          {project.status === "completed" &&
            applicationStatus === "accepted" &&
            applicationId &&
            !isOwner && (
              <MobileReviewPanel
                title="¿Cómo fue trabajar juntos?"
                name={creator?.full_name?.trim() || "Creador del proyecto"}
                avatarUrl={creator?.avatar_url ?? null}
                applicationId={applicationId}
                projectId={project.id}
                reviewerId={user!.id}
                reviewedId={project.owner_id!}
                reviewerRole="professional"
                existingReview={reviews.find(
                  (review) =>
                    review.application_id === applicationId &&
                    review.reviewer_id === user?.id,
                )}
                onCreated={handleReviewCreated}
              />
            )}

          {applicationMessage && (
            <View style={styles.applicationErrorBox}>
              <Text style={styles.applicationErrorText}>
                {applicationMessage}
              </Text>
            </View>
          )}

          <ProjectSection
            icon="document-text-outline"
            eyebrow="BRIEF"
            title="Sobre el proyecto"
          >
            <Text style={styles.description}>
              {project.description?.trim() ||
                "La persona que publicó este proyecto todavía no agregó un brief."}
            </Text>
          </ProjectSection>

          <ProjectSection
            icon="checkmark-circle-outline"
            eyebrow="ENTREGABLES"
            title="Qué se espera recibir"
          >
            {deliverables.length > 0 ? (
              <View style={styles.deliverablesList}>
                {deliverables.map((item, index) => (
                  <View
                    key={`${item}-${index}`}
                    style={styles.deliverableItem}
                  >
                    <View style={styles.deliverableNumber}>
                      <Text style={styles.deliverableNumberText}>
                        {index + 1}
                      </Text>
                    </View>

                    <Text style={styles.deliverableText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>
                No se especificaron entregables.
              </Text>
            )}
          </ProjectSection>

          <ProjectSection
            icon="link-outline"
            eyebrow="REFERENCIAS"
            title="Inspiración y material de apoyo"
          >
            {references.length > 0 ? (
              <View style={styles.referencesList}>
                {references.map((reference, index) => (
                  <Pressable
                    key={`${reference}-${index}`}
                    onPress={() => Linking.openURL(normalizeUrl(reference))}
                    style={({ pressed }) => [
                      styles.referenceItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.referenceBody}>
                      <Text style={styles.referenceLabel}>
                        Referencia {index + 1}
                      </Text>
                      <Text
                        style={styles.referenceUrl}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {reference}
                      </Text>
                    </View>

                    <Ionicons
                      name="open-outline"
                      size={19}
                      color="#B995FF"
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>
                No se agregaron referencias.
              </Text>
            )}
          </ProjectSection>

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

      <ReviewCelebrationModal
        visible={Boolean(reviewCelebration)}
        review={reviewCelebration?.review ?? null}
        name={reviewCelebration?.name ?? ""}
        avatarUrl={reviewCelebration?.avatarUrl ?? null}
        reviewedId={reviewCelebration?.reviewedId ?? ""}
        onClose={() => setReviewCelebration(null)}
      />

      <View style={styles.bottomBar}>
        <View style={styles.bottomBudgetContainer}>
          <Text style={styles.bottomLabel}>Presupuesto</Text>
          <Text style={styles.bottomBudget} numberOfLines={2}>
            {formatBudget(project.budget)}
          </Text>
        </View>

        {applicationStatus === "accepted" && !isOwner ? (
          <Pressable
            disabled={!creator?.whatsapp}
            onPress={handleContactCreator}
            style={({ pressed }) => [
              styles.whatsappContactButton,
              !creator?.whatsapp && styles.disabledButton,
              pressed && creator?.whatsapp && styles.pressed,
            ]}
          >
            <Ionicons name="logo-whatsapp" size={21} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>
              {creator?.whatsapp ? "Contactar" : "Sin WhatsApp"}
            </Text>
          </Pressable>
        ) : (
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
        )}
      </View>
    </SafeAreaView>
  );
}


function MobileReviewPanel({
  title,
  name,
  avatarUrl,
  applicationId,
  projectId,
  reviewerId,
  reviewedId,
  reviewerRole,
  existingReview,
  onCreated,
}: {
  title: string;
  name: string;
  avatarUrl: string | null;
  applicationId: string;
  projectId: string;
  reviewerId: string;
  reviewedId: string;
  reviewerRole: "creator" | "professional";
  existingReview?: Review;
  onCreated: (
    review: Review,
    celebration: {
      name: string;
      avatarUrl: string | null;
      reviewedId: string;
    },
  ) => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!rating || submitting || existingReview) return;

    setSubmitting(true);

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        project_id: projectId,
        application_id: applicationId,
        reviewer_id: reviewerId,
        reviewed_id: reviewedId,
        reviewer_role: reviewerRole,
        rating,
        comment: comment.trim() || null,
      })
      .select(
        "id, application_id, reviewer_id, reviewed_id, rating, comment, created_at",
      )
      .maybeSingle();

    setSubmitting(false);

    if (error) {
      Alert.alert("No pudimos publicar la experiencia", error.message);
      return;
    }

    if (!data) {
      Alert.alert(
        "No pudimos confirmar la publicación",
        "Intentá nuevamente en unos segundos.",
      );
      return;
    }

    onCreated(data as Review, { name, avatarUrl, reviewedId });
  }

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.reviewAvatar} />
        ) : (
          <View style={styles.reviewAvatarFallback}>
            <Ionicons name="person-outline" size={21} color="#FFD43B" />
          </View>
        )}

        <View style={styles.reviewHeaderBody}>
          <Text style={styles.reviewEyebrow}>EXPERIENCIA VERIFICADA</Text>
          <Text style={styles.reviewTitle}>{title}</Text>
          <Text style={styles.reviewName}>{name}</Text>
        </View>
      </View>

      <View style={styles.reviewStars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            disabled={Boolean(existingReview)}
            onPress={() => setRating(value)}
            hitSlop={6}
            style={({ pressed }) => pressed && !existingReview && styles.pressed}
          >
            <Ionicons
              name={value <= rating ? "star" : "star-outline"}
              size={32}
              color={value <= rating ? "#FFD43B" : "#555157"}
            />
          </Pressable>
        ))}
      </View>

      {existingReview ? (
        <>
          {existingReview.comment ? (
            <Text style={styles.reviewPublishedComment}>
              “{existingReview.comment}”
            </Text>
          ) : null}

          <View style={styles.reviewVerifiedRow}>
            <Ionicons name="checkmark-circle" size={17} color="#62E6A7" />
            <Text style={styles.reviewVerifiedText}>
              Proyecto verificado por LensUP
            </Text>
          </View>
        </>
      ) : (
        <>
          <TextInput
            value={comment}
            onChangeText={(value) => setComment(value.slice(0, 800))}
            multiline
            maxLength={800}
            placeholder="Contá cómo fue trabajar juntos..."
            placeholderTextColor="#656169"
            style={styles.reviewInput}
            textAlignVertical="top"
          />

          <Text style={styles.reviewCounter}>{comment.length}/800</Text>

          <Pressable
            disabled={!rating || submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.reviewSubmitButton,
              (!rating || submitting) && styles.reviewSubmitDisabled,
              pressed && rating > 0 && !submitting && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Text style={styles.reviewSubmitText}>Publicar experiencia</Text>
            )}
          </Pressable>

          <Text style={styles.reviewDisclaimer}>
            Una vez publicada, no podrá editarse ni eliminarse.
          </Text>
        </>
      )}
    </View>
  );
}

function ReviewCelebrationModal({
  visible,
  review,
  name,
  avatarUrl,
  reviewedId,
  onClose,
}: {
  visible: boolean;
  review: Review | null;
  name: string;
  avatarUrl: string | null;
  reviewedId: string;
  onClose: () => void;
}) {
  const scale = useState(() => new Animated.Value(0.86))[0];
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.86);
      opacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  function handleProfile() {
    onClose();
    if (reviewedId) {
      router.push(`/profile/${reviewedId}` as never);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.celebrationBackdrop}>
        <Animated.View
          style={[
            styles.celebrationCard,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Pressable onPress={onClose} style={styles.celebrationClose}>
            <Ionicons name="close" size={20} color="#B3AFB7" />
          </Pressable>

          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.celebrationAvatar} />
          ) : (
            <View style={styles.celebrationAvatarFallback}>
              <Ionicons name="person-outline" size={28} color="#FFD43B" />
            </View>
          )}

          <View style={styles.celebrationStars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Ionicons
                key={value}
                name="star"
                size={31}
                color={
                  value <= (review?.rating ?? 0) ? "#FFD43B" : "#3B383D"
                }
              />
            ))}
          </View>

          <Text style={styles.celebrationEyebrow}>
            EXPERIENCIA VERIFICADA
          </Text>
          <Text style={styles.celebrationTitle}>¡Gracias!</Text>
          <Text style={styles.celebrationText}>
            Tu experiencia ya forma parte del perfil de{" "}
            <Text style={styles.celebrationStrong}>{name}</Text>.
          </Text>

          <View style={styles.celebrationVerified}>
            <Ionicons name="checkmark" size={16} color="#70F0B4" />
            <Text style={styles.celebrationVerifiedText}>
              Proyecto verificado por LensUP
            </Text>
          </View>

          <Pressable
            onPress={handleProfile}
            style={({ pressed }) => [
              styles.celebrationPrimary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.celebrationPrimaryText}>Ver perfil</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.celebrationSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.celebrationSecondaryText}>
              Seguir en el proyecto
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ProjectSection({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.projectSectionCard}>
      <View style={styles.projectSectionHeader}>
        <View style={styles.projectSectionIcon}>
          <Ionicons name={icon} size={21} color="#C7A7FF" />
        </View>

        <View style={styles.projectSectionHeading}>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>

      <View style={styles.projectSectionContent}>{children}</View>
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
  headerPlaceholder: {
    width: 44,
    height: 44,
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
  heroRoles: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 22,
  },
  heroRoleItem: {
    width: 96,
    alignItems: "center",
  },
  heroRoleLabel: {
    minHeight: 34,
    marginTop: 9,
    color: "#E8E0F5",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  heroIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7651A8",
    borderRadius: 23,
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
  creatorCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#30283A",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#151218",
  },
  creatorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#261B35",
  },
  creatorIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#261B35",
  },
  creatorBody: {
    flex: 1,
    marginLeft: 14,
  },
  creatorLabel: {
    color: "#85858A",
    fontSize: 12,
    fontWeight: "600",
  },
  creatorName: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  creatorMeta: {
    marginTop: 4,
    color: "#9B9B9F",
    fontSize: 13,
    lineHeight: 18,
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
  acceptedContactBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#246B48",
    borderRadius: 18,
    padding: 15,
    backgroundColor: "#10271C",
  },
  acceptedContactIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#173D29",
  },
  acceptedContactBody: {
    flex: 1,
  },
  acceptedContactTitle: {
    color: "#B9F3D4",
    fontSize: 15,
    fontWeight: "800",
  },
  acceptedContactText: {
    marginTop: 4,
    color: "#84B89C",
    fontSize: 12,
    lineHeight: 18,
  },
  applicationErrorText: {
    color: "#FFB7C0",
    fontSize: 13,
    lineHeight: 19,
  },
  projectSectionCard: {
    marginTop: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 22,
    backgroundColor: "#111113",
  },
  projectSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#262629",
    padding: 17,
  },
  projectSectionIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#251A34",
  },
  projectSectionHeading: {
    flex: 1,
  },
  projectSectionContent: {
    padding: 17,
  },
  sectionEyebrow: {
    color: "#8F68D0",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  sectionTitle: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  description: {
    color: "#A0A0A5",
    fontSize: 15,
    lineHeight: 24,
  },
  emptySectionText: {
    color: "#77777C",
    fontSize: 14,
    lineHeight: 21,
  },
  deliverablesList: {
    gap: 10,
  },
  deliverableItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 16,
    padding: 13,
    backgroundColor: "#0D0D0F",
  },
  deliverableNumber: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#251A34",
  },
  deliverableNumberText: {
    color: "#D6C0FF",
    fontSize: 11,
    fontWeight: "900",
  },
  deliverableText: {
    flex: 1,
    color: "#B5B5BA",
    fontSize: 14,
    lineHeight: 21,
  },
  referencesList: {
    gap: 10,
  },
  referenceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#0D0D0F",
  },
  referenceBody: {
    flex: 1,
  },
  referenceLabel: {
    color: "#B995FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  referenceUrl: {
    marginTop: 5,
    color: "#8E8E93",
    fontSize: 12,
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
  whatsappContactButton: {
    minWidth: 160,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    paddingHorizontal: 20,
    backgroundColor: "#20A85A",
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
  reviewCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#705716",
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#211706",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  reviewAvatarFallback: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6D571A",
    borderRadius: 16,
    backgroundColor: "#31250B",
  },
  reviewHeaderBody: {
    flex: 1,
    marginLeft: 12,
  },
  reviewEyebrow: {
    color: "#D5B94B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  reviewTitle: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  reviewName: {
    marginTop: 3,
    color: "#9C9588",
    fontSize: 13,
  },
  reviewStars: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    paddingHorizontal: 4,
  },
  reviewInput: {
    minHeight: 118,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#433B2E",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: "#151109",
  },
  reviewCounter: {
    marginTop: 7,
    color: "#746E65",
    fontSize: 11,
    textAlign: "right",
  },
  reviewSubmitButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 17,
    backgroundColor: "#FFD43B",
  },
  reviewSubmitDisabled: {
    opacity: 0.45,
  },
  reviewSubmitText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  reviewDisclaimer: {
    marginTop: 12,
    color: "#736D64",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  reviewPublishedComment: {
    marginTop: 18,
    color: "#D8D2C8",
    fontSize: 14,
    lineHeight: 21,
  },
  reviewVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
  },
  reviewVerifiedText: {
    color: "#62E6A7",
    fontSize: 12,
    fontWeight: "800",
  },
  celebrationBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
  },
  celebrationCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6A5315",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 24,
    backgroundColor: "#0C0C0E",
  },
  celebrationClose: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#343438",
    borderRadius: 19,
    backgroundColor: "#171719",
  },
  celebrationAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  celebrationAvatarFallback: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6A5315",
    borderRadius: 36,
    backgroundColor: "#261E09",
  },
  celebrationStars: {
    flexDirection: "row",
    gap: 5,
    marginTop: 24,
  },
  celebrationEyebrow: {
    marginTop: 24,
    color: "#FFD43B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  celebrationTitle: {
    marginTop: 9,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  celebrationText: {
    marginTop: 12,
    color: "#AAA6AD",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  celebrationStrong: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  celebrationVerified: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#1A694A",
    borderRadius: 15,
    paddingVertical: 12,
    backgroundColor: "#0D2B20",
  },
  celebrationVerifiedText: {
    color: "#70F0B4",
    fontSize: 12,
    fontWeight: "800",
  },
  celebrationPrimary: {
    width: "100%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    borderRadius: 17,
    backgroundColor: "#FFD43B",
  },
  celebrationPrimaryText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  celebrationSecondary: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  celebrationSecondaryText: {
    color: "#A7A3AA",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
