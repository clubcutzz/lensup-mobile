import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

type TalentProfile = {
  id: string;
  full_name: string | null;
  headline: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  roles: string[] | string | null;
  specialties: string[] | string | null;
  is_available: boolean | null;
  urgent_available: boolean | null;
  has_transport: boolean | null;
};

type ReviewSummary = { count: number; average: number };
type ReviewRow = { reviewed_id: string; rating: number | null };

const filters = [
  { id: "all", label: "Todos", matches: [] },
  { id: "photo", label: "Fotografía", matches: ["fotografo", "fotografia"] },
  { id: "video", label: "Video", matches: ["videografo", "video", "filmmaker"] },
  { id: "edit", label: "Edición", matches: ["editor", "edicion", "colorista"] },
  { id: "drone", label: "Drone", matches: ["drone"] },
  { id: "stream", label: "Streaming", matches: ["streaming"] },
];

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toList(value: TalentProfile["roles"]) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function shuffleTalents(items: TalentProfile[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function isProfileVisible(profile: TalentProfile) {
  return Boolean(profile.full_name?.trim());
}

export default function TalentsScreen() {
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [reviewsByProfile, setReviewsByProfile] = useState<Record<string, ReviewSummary>>({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTalents = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setErrorMessage(null);

    const [profilesResult, reviewsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, headline, city, bio, avatar_url, roles, specialties, is_available, urgent_available, has_transport"),
      supabase.from("reviews").select("reviewed_id, rating"),
    ]);

    if (profilesResult.error) {
      console.error("Error cargando talentos:", profilesResult.error);
      setErrorMessage("No pudimos cargar los talentos. Deslizá hacia abajo para volver a intentar.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const summaries: Record<string, ReviewSummary> = {};
    ((reviewsResult.data ?? []) as ReviewRow[]).forEach((review) => {
      if (!review.reviewed_id || review.rating == null) return;
      const current = summaries[review.reviewed_id] ?? { count: 0, average: 0 };
      const count = current.count + 1;
      summaries[review.reviewed_id] = {
        count,
        average: (current.average * current.count + Number(review.rating)) / count,
      };
    });

    const visibleProfiles = (
      (profilesResult.data ?? []) as TalentProfile[]
    ).filter(isProfileVisible);

    setTalents(shuffleTalents(visibleProfiles));
    setReviewsByProfile(summaries);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadTalents(true);
  }, [loadTalents]);

  const filteredTalents = useMemo(() => {
    const query = normalizeText(search);
    const selectedFilter = filters.find((filter) => filter.id === activeFilter);

    return talents.filter((talent) => {
      const searchable = normalizeText([
        talent.full_name,
        talent.headline,
        talent.city,
        talent.bio,
        ...toList(talent.roles),
        ...toList(talent.specialties),
      ].filter(Boolean).join(" "));

      const matchesSearch = !query || searchable.includes(query);
      const matchesFilter = !selectedFilter || selectedFilter.id === "all" ||
        selectedFilter.matches.some((match) => searchable.includes(normalizeText(match)));

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, search, talents]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Buscando talentos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={filteredTalents}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTalents();
            }}
            tintColor="#9A5CFF"
            colors={["#9A5CFF"]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.brand}>Lens<Text style={styles.brandAccent}>UP</Text></Text>
              <View style={styles.headerPlaceholder} />
            </View>

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>RED AUDIOVISUAL</Text>
              <Text style={styles.title}>Encontrá al talento ideal.</Text>
              <Text style={styles.subtitle}>Descubrí profesionales, explorá sus perfiles y conectá con la persona indicada para tu próximo proyecto.</Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#77777C" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nombre, rol o ciudad..."
                placeholderTextColor="#626267"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={19} color="#77777C" />
                </Pressable>
              )}
            </View>

            <FlatList
              horizontal
              data={filters}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => {
                const active = activeFilter === item.id;
                return (
                  <Pressable onPress={() => setActiveFilter(item.id)} style={[styles.filterChip, active && styles.filterChipActive]}>
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />

            <View style={styles.resultsRow}>
              <Text style={styles.resultsTitle}>Profesionales</Text>
              <Text style={styles.resultsCount}>{filteredTalents.length} {filteredTalents.length === 1 ? "resultado" : "resultados"}</Text>
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="cloud-offline-outline" size={22} color="#D9B8FF" />
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable onPress={() => loadTalents(true)} style={styles.retryButton}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TalentCard
            talent={item}
            reviewSummary={reviewsByProfile[item.id]}
            onPress={() => router.push(`/profile/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        ListEmptyComponent={!errorMessage ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={34} color="#8D63C7" />
            <Text style={styles.emptyTitle}>
              {talents.length === 0
                ? "Todavía no hay profesionales registrados"
                : "No encontramos talentos"}
            </Text>
            <Text style={styles.emptyText}>
              {talents.length === 0
                ? "Los profesionales aparecerán acá cuando creen su perfil en LensUP."
                : "Probá con otra búsqueda o seleccioná un filtro diferente."}
            </Text>

            {talents.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
                style={({ pressed }) => [
                  styles.clearFiltersButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        ListFooterComponent={<View style={styles.footerSpace} />}
      />
    </SafeAreaView>
  );
}

function TalentCard({ talent, reviewSummary, onPress }: { talent: TalentProfile; reviewSummary?: ReviewSummary; onPress: () => void }) {
  const displayName = talent.full_name?.trim() || "Profesional LensUP";
  const roles = toList(talent.roles);
  const specialties = toList(talent.specialties);
  const primaryRole = talent.headline?.trim() || roles[0] || specialties[0] || "Profesional audiovisual";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardAvatar}>
        {talent.avatar_url ? (
          <Image source={{ uri: talent.avatar_url }} style={styles.cardAvatarImage} resizeMode="cover" />
        ) : (
          <Text style={styles.cardAvatarText}>{getInitials(displayName) || "LU"}</Text>
        )}
        <View style={[styles.availabilityIndicator, talent.is_available === false && styles.availabilityIndicatorInactive]} />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.cardRole} numberOfLines={1}>{primaryRole}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#8E8E93" />
            <Text style={styles.metaText} numberOfLines={1}>{talent.city?.trim() || "Ubicación no especificada"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name={reviewSummary?.count ? "star" : "star-outline"} size={14} color={reviewSummary?.count ? "#FFD43B" : "#77777C"} />
            <Text style={styles.metaText}>{reviewSummary?.count ? `${reviewSummary.average.toFixed(1)} · ${reviewSummary.count}` : "Perfil nuevo"}</Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          <View style={[styles.statusBadge, talent.is_available === false && styles.statusBadgeInactive]}>
            <Text style={[styles.statusBadgeText, talent.is_available === false && styles.statusBadgeTextInactive]}>
              {talent.is_available === false ? "No disponible" : "Disponible"}
            </Text>
          </View>
          {talent.has_transport && (
            <View style={styles.secondaryBadge}>
              <Ionicons name="car-outline" size={12} color="#D6C0FF" />
              <Text style={styles.secondaryBadgeText}>Locomoción</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#66666B" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#080808" },
  centeredScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#080808" },
  loadingText: { marginTop: 14, color: "#8E8E93", fontSize: 14 },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 18, paddingTop: Platform.OS === "web" ? 28 : 10 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 15, backgroundColor: "#121214" },
  brand: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.7 },
  brandAccent: { color: "#9A5CFF" },
  headerPlaceholder: { width: 44, height: 44 },
  hero: { marginTop: 38 },
  eyebrow: { color: "#9A5CFF", fontSize: 11, fontWeight: "800", letterSpacing: 2.1 },
  title: { maxWidth: 560, marginTop: 12, color: "#FFFFFF", fontSize: 34, fontWeight: "900", lineHeight: 40, letterSpacing: -1.2 },
  subtitle: { maxWidth: 570, marginTop: 13, color: "#8E8E93", fontSize: 15, lineHeight: 22 },
  searchBox: { height: 54, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 28, borderWidth: 1, borderColor: "#2B2B2F", borderRadius: 18, paddingHorizontal: 16, backgroundColor: "#111113" },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },
  filters: { gap: 8, paddingTop: 16, paddingBottom: 4 },
  filterChip: { borderWidth: 1, borderColor: "#29292C", borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9, backgroundColor: "#101012" },
  filterChipActive: { borderColor: "#6D43B3", backgroundColor: "#27183B" },
  filterText: { color: "#8D8D92", fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#DECFFF" },
  resultsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 30, marginBottom: 14 },
  resultsTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  resultsCount: { color: "#77777C", fontSize: 12, fontWeight: "600" },
  errorBox: { alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#45305F", borderRadius: 18, padding: 22, backgroundColor: "#15101C" },
  errorText: { marginTop: 10, color: "#BEB5C8", fontSize: 13, lineHeight: 20, textAlign: "center" },
  retryButton: { marginTop: 15, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#7C42D8" },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 22, padding: 14, backgroundColor: "#111113" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }], backgroundColor: "#18141E" },
  cardAvatar: { width: 78, height: 78, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#7048A7", borderRadius: 24, backgroundColor: "#251637" },
  cardAvatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  cardAvatarText: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  availabilityIndicator: { position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderWidth: 4, borderColor: "#111113", borderRadius: 9, backgroundColor: "#22C55E" },
  availabilityIndicatorInactive: { backgroundColor: "#71717A" },
  cardContent: { flex: 1, marginLeft: 14 },
  cardName: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  cardRole: { marginTop: 4, color: "#B8A0DD", fontSize: 13, lineHeight: 18 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 9 },
  metaItem: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { maxWidth: 170, color: "#85858A", fontSize: 11, fontWeight: "600" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  statusBadge: { borderWidth: 1, borderColor: "#225B43", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "#102C21" },
  statusBadgeInactive: { borderColor: "#3B3B3F", backgroundColor: "#1C1C1F" },
  statusBadgeText: { color: "#75E0A7", fontSize: 10, fontWeight: "800" },
  statusBadgeTextInactive: { color: "#8E8E93" },
  secondaryBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#513878", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "#241833" },
  secondaryBadgeText: { color: "#D6C0FF", fontSize: 10, fontWeight: "800" },
  cardSeparator: { height: 12 },
  emptyState: { alignItems: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 22, paddingHorizontal: 26, paddingVertical: 44, backgroundColor: "#101012" },
  emptyTitle: { marginTop: 14, color: "#D0D0D3", fontSize: 17, fontWeight: "800" },
  emptyText: { maxWidth: 380, marginTop: 8, color: "#77777C", fontSize: 13, lineHeight: 20, textAlign: "center" },
  clearFiltersButton: { marginTop: 18, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#7C42D8" },
  clearFiltersText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  footerSpace: { height: 48 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
