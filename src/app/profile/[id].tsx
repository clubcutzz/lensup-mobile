import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  roles: string[] | string | null;
  specialties: string[] | string | null;
  kit: string[] | string | null;
  software: string[] | string | null;
  has_transport: boolean | null;
  is_available: boolean | null;
  urgent_available: boolean | null;
  instagram_url: string | null;
  youtube_url: string | null;
  vimeo_url: string | null;
};

type PortfolioItem = {
  id: string;
  title: string | null;
  media_url: string;
  type: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  project: {
    id: string;
    title: string | null;
    role: string | null;
  } | null;
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

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [averageRating, setAverageRating] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!profileId) {
        setErrorMessage("No encontramos el identificador del perfil.");
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setErrorMessage(null);

      const [profileResult, reviewsResult, portfolioResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, headline, city, bio, avatar_url, whatsapp, roles, specialties, kit, software, has_transport, is_available, urgent_available, instagram_url, youtube_url, vimeo_url",
          )
          .eq("id", profileId)
          .maybeSingle(),

        supabase
          .from("reviews")
          .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer:profiles!reviews_reviewer_id_fkey (
              id,
              full_name,
              avatar_url
            ),
            project:projects (
              id,
              title,
              role
            )
          `)
          .eq("reviewed_id", profileId)
          .order("created_at", { ascending: false }),

        supabase
          .from("portfolio_items")
          .select(
            "id, title, media_url, type, is_featured, sort_order, created_at",
          )
          .eq("profile_id", profileId)
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

      if (profileResult.error || !profileResult.data) {
        console.error("Error cargando perfil:", profileResult.error);
        setErrorMessage("No pudimos cargar este perfil.");
        setLoadingProfile(false);
        return;
      }

      setProfile(profileResult.data as ProfileRow);

      if (portfolioResult.error) {
        console.error("Error cargando portfolio:", portfolioResult.error);
        setPortfolio([]);
      } else {
        setPortfolio((portfolioResult.data ?? []) as PortfolioItem[]);
      }

      if (reviewsResult.error) {
        console.error("Error cargando reseñas:", reviewsResult.error);
        setReviews([]);
        setAverageRating(0);
      } else {
        const normalized = ((reviewsResult.data ?? []) as any[]).map((item) => ({
          ...item,
          reviewer: Array.isArray(item.reviewer)
            ? (item.reviewer[0] ?? null)
            : item.reviewer,
          project: Array.isArray(item.project)
            ? (item.project[0] ?? null)
            : item.project,
        })) as ReviewRow[];

        setReviews(normalized);

        const average =
          normalized.length > 0
            ? normalized.reduce((sum, review) => sum + review.rating, 0) /
              normalized.length
            : 0;

        setAverageRating(average);
      }

      setLoadingProfile(false);
    }

    loadProfile();
  }, [profileId]);

  const displayName = useMemo(() => {
    return profile?.full_name?.trim() || "Profesional LensUP";
  }, [profile]);

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [displayName]);

  const { width: windowWidth } = useWindowDimensions();
  const specialties = formatList(profile?.specialties);
  const roles = formatList(profile?.roles);
  const kit = formatList(profile?.kit);
  const software = formatList(profile?.software);
  const isMyProfile = user?.id === profile?.id;

  const socialLinks = [
    {
      key: "instagram",
      label: "Instagram",
      icon: "logo-instagram" as const,
      url: normalizeExternalUrl(profile?.instagram_url),
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: "logo-youtube" as const,
      url: normalizeExternalUrl(profile?.youtube_url),
    },
    {
      key: "vimeo",
      label: "Vimeo",
      icon: "logo-vimeo" as const,
      url: normalizeExternalUrl(profile?.vimeo_url),
    },
  ].filter((item) => Boolean(item.url));

  const portfolioPhotos = useMemo(
    () =>
      portfolio.filter(
        (item) =>
          item.type === "photo" ||
          /\.(jpe?g|png|webp|gif)(?:\?.*)?$/i.test(item.media_url || ""),
      ),
    [portfolio],
  );

  const visiblePortfolioPhotos = useMemo(
    () => portfolioPhotos.slice(0, 6),
    [portfolioPhotos],
  );

  const portfolioGap = 8;
  const portfolioCardWidth = Math.max(
    86,
    (Math.min(windowWidth, 720) - 36 - portfolioGap * 2) / 3,
  );

  async function handleWhatsApp() {
    const phone = profile?.whatsapp?.replace(/\D/g, "");

    if (!phone) {
      Alert.alert(
        "WhatsApp no disponible",
        "Este profesional todavía no agregó un número de contacto.",
      );
      return;
    }

    const message = encodeURIComponent(
      `Hola ${displayName}, te encontré en LensUP y me gustaría contactarte por un proyecto audiovisual.`,
    );

    const url = `https://wa.me/${phone}?text=${message}`;
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert(
        "No pudimos abrir WhatsApp",
        "Revisá que WhatsApp esté instalado.",
      );
      return;
    }

    await Linking.openURL(url);
  }

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !profile) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <View style={styles.errorIcon}>
          <Ionicons name="person-circle-outline" size={38} color="#C7A7FF" />
        </View>

        <Text style={styles.errorTitle}>Perfil no disponible</Text>
        <Text style={styles.errorText}>
          {errorMessage || "No pudimos encontrar este perfil."}
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.errorButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.errorButtonText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir al inicio"
            onPress={() => router.replace("/")}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.brand}>
              Lens<Text style={styles.brandAccent}>UP</Text>
            </Text>
          </Pressable>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initials || "LU"}</Text>
            )}

            <View
              style={[
                styles.statusIndicator,
                profile.is_available === false &&
                  styles.statusIndicatorUnavailable,
              ]}
            />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{displayName}</Text>

            <Text style={styles.headline}>
              {profile.headline?.trim() || "Profesional audiovisual"}
            </Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color="#8E8E93"
              />

              <Text style={styles.locationText}>
                {profile.city?.trim() || "Ubicación no especificada"}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons
                name={reviews.length > 0 ? "star" : "star-outline"}
                size={15}
                color={reviews.length > 0 ? "#FFD43B" : "#77777C"}
              />
              <Text style={styles.ratingText}>
                {reviews.length > 0 ? averageRating.toFixed(1) : "Perfil nuevo"}
              </Text>
              {reviews.length > 0 && (
                <Text style={styles.ratingCount}>
                  · {reviews.length} experiencia
                  {reviews.length !== 1 ? "s" : ""}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusCardLeft}>
            <View
              style={[
                styles.statusDot,
                profile.is_available === false &&
                  styles.statusDotUnavailable,
              ]}
            />

            <View>
              <Text style={styles.statusLabel}>Disponibilidad</Text>
              <Text style={styles.statusValue}>
                {profile.is_available === false
                  ? "No disponible"
                  : "Disponible ahora"}
              </Text>
            </View>
          </View>

          <View style={styles.statusBadges}>
            {profile.urgent_available && (
              <SmallBadge
                icon="flash"
                label="Urgencias"
                variant="red"
              />
            )}

            {profile.has_transport && (
              <SmallBadge
                icon="car-outline"
                label="Locomoción"
                variant="violet"
              />
            )}
          </View>
        </View>

        {!isMyProfile && profile.whatsapp && (
        <Pressable
          onPress={handleWhatsApp}
          style={({ pressed }) => [
            styles.contactButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Contactar</Text>
        </Pressable>
        )}

        {socialLinks.length > 0 && (
          <View style={styles.socialSection}>
            <Text style={styles.socialSectionTitle}>Redes sociales</Text>

            <View style={styles.socialLinksRow}>
              {socialLinks.map((social) => (
                <Pressable
                  key={social.key}
                  onPress={() => Linking.openURL(social.url)}
                  style={({ pressed }) => [
                    styles.socialButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name={social.icon} size={19} color="#D6C0FF" />
                  <Text style={styles.socialButtonText}>{social.label}</Text>
                  <Ionicons name="open-outline" size={14} color="#77777C" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {visiblePortfolioPhotos.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.portfolioEyebrow}>PORTFOLIO VISUAL</Text>
                <Text style={styles.portfolioTitle}>Una mirada a su trabajo.</Text>
              </View>

              {portfolioPhotos.length > 0 && (
                <Pressable
                  onPress={() => setSelectedPhotoIndex(0)}
                  style={({ pressed }) => [
                    styles.viewAllButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.viewAllText}>
                    Ver todas ({portfolioPhotos.length})
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color="#A775FF"
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.portfolioGrid}>
              {visiblePortfolioPhotos.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedPhotoIndex(index)}
                  style={({ pressed }) => [
                    styles.portfolioItem,
                    { width: portfolioCardWidth },
                    pressed && styles.portfolioItemPressed,
                  ]}
                >
                  <Image
                    source={{ uri: item.media_url }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />

                  <View style={styles.zoomBadge}>
                    <Ionicons name="expand-outline" size={13} color="#FFFFFF" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.portfolioEyebrow}>PORTFOLIO VISUAL</Text>

            <View style={styles.emptyPortfolioCard}>
              <Ionicons name="images-outline" size={28} color="#8D63C7" />
              <Text style={styles.emptyPortfolioTitle}>
                Todavía no agregó trabajos
              </Text>
              <Text style={styles.emptyPortfolioText}>
                Las fotografías destacadas aparecerán acá cuando el profesional complete su portfolio.
              </Text>
            </View>
          </View>
        )}

        {profile.bio?.trim() ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre este profesional</Text>

            <View style={styles.menuCard}>
              <View style={styles.bioContent}>
                <Text style={styles.bioText}>{profile.bio.trim()}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {(specialties.length > 0 || roles.length > 0) && (
          <ProfileListSection
            title="Especialidades"
            icon="sparkles-outline"
            items={specialties.length > 0 ? specialties : roles}
          />
        )}

        {kit.length > 0 && (
          <ProfileListSection
            title="Kit"
            icon="camera-outline"
            items={kit}
          />
        )}

        {software.length > 0 && (
          <ProfileListSection
            title="Software"
            icon="laptop-outline"
            items={software}
          />
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Experiencias verificadas</Text>

            <View style={styles.reviewSummary}>
              <Ionicons name="star" size={14} color="#FFD43B" />
              <Text style={styles.reviewSummaryRating}>
                {reviews.length > 0 ? averageRating.toFixed(1) : "—"}
              </Text>
              <Text style={styles.reviewSummaryCount}>({reviews.length})</Text>
            </View>
          </View>

          {reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyReviewsCard}>
              <Ionicons name="star-outline" size={24} color="#66666B" />
              <Text style={styles.emptyReviewsTitle}>
                Todavía no hay experiencias verificadas
              </Text>
              <Text style={styles.emptyReviewsText}>
                Las reseñas aparecerán cuando complete proyectos en LensUP.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <PortfolioLightbox
        photos={portfolioPhotos}
        index={selectedPhotoIndex}
        onIndexChange={setSelectedPhotoIndex}
        onClose={() => setSelectedPhotoIndex(null)}
      />
    </SafeAreaView>
  );
}

function PortfolioLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: PortfolioItem[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  onClose: () => void;
}) {
  const visible = index !== null && Boolean(photos[index]);
  const item = index !== null ? photos[index] : null;
  const hasMultiple = photos.length > 1;

  function goPrevious() {
    if (index === null || !photos.length) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }

  function goNext() {
    if (index === null || !photos.length) return;
    onIndexChange((index + 1) % photos.length);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.lightbox}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar galería"
          onPress={onClose}
          style={({ pressed }) => [
            styles.lightboxClose,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>

        {item && (
          <Image
            source={{ uri: item.media_url }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
        )}

        {hasMultiple && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Foto anterior"
              onPress={goPrevious}
              style={({ pressed }) => [
                styles.lightboxArrow,
                styles.lightboxArrowLeft,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chevron-back" size={27} color="#FFFFFF" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Foto siguiente"
              onPress={goNext}
              style={({ pressed }) => [
                styles.lightboxArrow,
                styles.lightboxArrowRight,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chevron-forward" size={27} color="#FFFFFF" />
            </Pressable>

            <View style={styles.lightboxCounter}>
              <Text style={styles.lightboxCounterText}>
                {(index ?? 0) + 1} / {photos.length}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function ProfileListSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.menuCard}>
        <View style={styles.listSectionContent}>
          <View style={styles.menuIcon}>
            <Ionicons name={icon} size={21} color="#D0B7FF" />
          </View>

          <View style={styles.tags}>
            {items.map((item) => (
              <View key={item} style={styles.tag}>
                <Text style={styles.tagText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function SmallBadge({
  icon,
  label,
  variant,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: "red" | "violet";
}) {
  return (
    <View
      style={[
        styles.smallBadge,
        variant === "red" && styles.smallBadgeRed,
        variant === "violet" && styles.smallBadgeViolet,
      ]}
    >
      <Ionicons
        name={icon}
        size={11}
        color={variant === "red" ? "#FF9BA8" : "#D6C0FF"}
      />
      <Text
        style={[
          styles.smallBadgeText,
          variant === "red" && styles.smallBadgeTextRed,
          variant === "violet" && styles.smallBadgeTextViolet,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const date = new Intl.DateTimeFormat("es-UY", {
    month: "short",
    year: "numeric",
  }).format(new Date(review.created_at));

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {review.reviewer?.avatar_url ? (
          <Image
            source={{ uri: review.reviewer.avatar_url }}
            style={styles.reviewAvatar}
          />
        ) : (
          <View style={styles.reviewAvatarFallback}>
            <Ionicons name="person-outline" size={18} color="#D0B7FF" />
          </View>
        )}

        <View style={styles.reviewIdentity}>
          <Text style={styles.reviewAuthor} numberOfLines={1}>
            {review.reviewer?.full_name || "Usuario de LensUP"}
          </Text>
          <Text style={styles.reviewDate}>{date}</Text>
        </View>

        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Ionicons
              key={value}
              name={value <= review.rating ? "star" : "star-outline"}
              size={14}
              color={value <= review.rating ? "#FFD43B" : "#4F4B52"}
            />
          ))}
        </View>
      </View>

      {review.comment ? (
        <Text style={styles.reviewComment}>“{review.comment}”</Text>
      ) : null}

      <View style={styles.reviewFooter}>
        {review.project ? (
          <View style={styles.projectChip}>
            <Text style={styles.projectChipText} numberOfLines={1}>
              {review.project.title || "Proyecto"}
              {review.project.role ? ` · ${review.project.role}` : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={14} color="#62E6A7" />
          <Text style={styles.verifiedText}>Verificada</Text>
        </View>
      </View>
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
    paddingHorizontal: 28,
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
  },
  errorText: {
    marginTop: 9,
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorButton: {
    marginTop: 22,
    borderRadius: 15,
    paddingHorizontal: 22,
    paddingVertical: 13,
    backgroundColor: "#712BE3",
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 15,
    backgroundColor: "#121214",
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 38,
  },
  avatar: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7048A7",
    borderRadius: 27,
    backgroundColor: "#251637",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 27,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statusIndicator: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 19,
    height: 19,
    borderWidth: 4,
    borderColor: "#080808",
    borderRadius: 10,
    backgroundColor: "#22C55E",
  },
  statusIndicatorUnavailable: {
    backgroundColor: "#71717A",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 17,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  headline: {
    marginTop: 6,
    color: "#B2B2B7",
    fontSize: 14,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  locationText: {
    color: "#7F7F84",
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  ratingCount: {
    color: "#77777C",
    fontSize: 11,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#111113",
  },
  statusCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  statusDotUnavailable: {
    backgroundColor: "#71717A",
  },
  statusLabel: {
    color: "#77777C",
    fontSize: 11,
    fontWeight: "600",
  },
  statusValue: {
    marginTop: 3,
    color: "#D6D6D9",
    fontSize: 14,
    fontWeight: "700",
  },
  statusBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
    flex: 1,
    marginLeft: 12,
  },
  smallBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  smallBadgeRed: {
    borderColor: "#7F2430",
    backgroundColor: "#331419",
  },
  smallBadgeViolet: {
    borderColor: "#513878",
    backgroundColor: "#241833",
  },
  smallBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  smallBadgeTextRed: {
    color: "#FF9BA8",
  },
  smallBadgeTextViolet: {
    color: "#D6C0FF",
  },
  contactButton: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 18,
    borderRadius: 17,
    backgroundColor: "#20A75A",
  },
  contactButtonDisabled: {
    opacity: 0.45,
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  socialSection: {
    marginTop: 18,
  },
  socialSectionTitle: {
    marginBottom: 10,
    color: "#B8B8BC",
    fontSize: 13,
    fontWeight: "700",
  },
  socialLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#3A3048",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "#17131D",
  },
  socialButtonText: {
    color: "#D8D8DC",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginTop: 32,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    color: "#B8B8BC",
    fontSize: 13,
    fontWeight: "700",
  },
  menuCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 22,
    backgroundColor: "#111113",
  },
  portfolioEyebrow: {
    color: "#9A5CFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.9,
  },
  portfolioTitle: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 7,
  },
  viewAllText: {
    color: "#A775FF",
    fontSize: 12,
    fontWeight: "800",
  },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  emptyPortfolioCard: {
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 34,
    backgroundColor: "#101012",
  },
  emptyPortfolioTitle: {
    marginTop: 12,
    color: "#D0D0D3",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyPortfolioText: {
    maxWidth: 360,
    marginTop: 7,
    color: "#77777C",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
  portfolioItem: {
    aspectRatio: 0.86,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 14,
    backgroundColor: "#111113",
  },
  portfolioItemPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  portfolioImage: {
    width: "100%",
    height: "100%",
  },
  zoomBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  lightbox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.97)",
  },
  lightboxImage: {
    width: "96%",
    height: "92%",
  },
  lightboxClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 24,
    right: 18,
    zIndex: 5,
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 23,
    backgroundColor: "rgba(20,20,20,0.72)",
  },
  lightboxArrow: {
    position: "absolute",
    top: "47%",
    zIndex: 5,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 24,
    backgroundColor: "rgba(20,20,20,0.64)",
  },
  lightboxArrowLeft: {
    left: 12,
  },
  lightboxArrowRight: {
    right: 12,
  },
  lightboxCounter: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 38 : 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(20,20,20,0.68)",
  },
  lightboxCounterText: {
    color: "#D8D8DC",
    fontSize: 12,
    fontWeight: "800",
  },
  bioContent: {
    padding: 18,
  },
  bioText: {
    color: "#A7A7AC",
    fontSize: 14,
    lineHeight: 23,
  },
  listSectionContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  menuIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#251A34",
  },
  tags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginLeft: 13,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1C1722",
  },
  tagText: {
    color: "#CDB4FF",
    fontSize: 11,
    fontWeight: "700",
  },
  reviewSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#6B571C",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#211907",
  },
  reviewSummaryRating: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  reviewSummaryCount: {
    color: "#928B7E",
    fontSize: 10,
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 20,
    padding: 15,
    backgroundColor: "#111113",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  reviewAvatarFallback: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#251A34",
  },
  reviewIdentity: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  reviewAuthor: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewDate: {
    marginTop: 3,
    color: "#727278",
    fontSize: 10,
    textTransform: "capitalize",
  },
  reviewStars: {
    flexDirection: "row",
    gap: 1,
  },
  reviewComment: {
    marginTop: 13,
    color: "#B8B4BB",
    fontSize: 13,
    lineHeight: 20,
  },
  reviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  projectChip: {
    maxWidth: "76%",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#1B1B1E",
  },
  projectChipText: {
    color: "#8F8B92",
    fontSize: 10,
    fontWeight: "700",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "#62E6A7",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyReviewsCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderStyle: "dashed",
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: "#101012",
  },
  emptyReviewsTitle: {
    marginTop: 10,
    color: "#B8B8BC",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyReviewsText: {
    marginTop: 6,
    color: "#77777C",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});