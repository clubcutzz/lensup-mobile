import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
  has_transport: boolean | null;
  is_available: boolean | null;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, headline, city, bio, avatar_url, has_transport, is_available",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.log("Error cargando perfil:", error);
      }

      setProfile((data as ProfileRow | null) ?? null);
      setLoadingProfile(false);
    }

    loadProfile();
  }, [user]);

  const displayName = useMemo(() => {
    if (profile?.full_name?.trim()) {
      return profile.full_name.trim();
    }

    const metadataName = user?.user_metadata?.full_name;

    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim();
    }

    return "Profesional LensUP";
  }, [profile, user]);

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [displayName]);

  async function handleSignOut() {
    try {
      setSubmitting(true);
      await signOut();
    } catch {
      Alert.alert(
        "No pudimos cerrar sesión",
        "Intentá nuevamente en unos segundos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function showComingSoon(label: string) {
    Alert.alert(
      label,
      "Esta sección ya quedó preparada y la conectaremos en el siguiente paso.",
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            Lens<Text style={styles.brandAccent}>UP</Text>
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configuración"
            onPress={() => showComingSoon("Configuración")}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="settings-outline" size={21} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials || "LU"}</Text>
            )}

            <View style={[styles.statusIndicator, profile?.is_available === false && styles.statusIndicatorUnavailable]} />
          </View>

          <View style={styles.profileInfo}>
            {loadingProfile ? (
              <ActivityIndicator size="small" color="#9A5CFF" />
            ) : (
              <>
                <Text style={styles.name}>{displayName}</Text>

                <Text style={styles.headline}>
                  {profile?.headline?.trim() ||
                    "Profesional audiovisual"}
                </Text>

                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color="#8E8E93"
                  />

                  <Text style={styles.locationText}>
                    {profile?.city?.trim() || "Montevideo, Uruguay"}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusCardLeft}>
            <View
              style={[
                styles.statusDot,
                profile?.is_available === false &&
                  styles.statusDotUnavailable,
              ]}
            />

            <View>
              <Text style={styles.statusLabel}>Disponibilidad</Text>
              <Text style={styles.statusValue}>
                {profile?.is_available === false
                  ? "No disponible"
                  : "Disponible ahora"}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={19} color="#77777C" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu actividad</Text>

          <View style={styles.menuCard}>
            <MenuItem
              icon="paper-plane-outline"
              title="Mis postulaciones"
              subtitle="Revisá los proyectos a los que te postulaste"
              onPress={() => router.push("/my-applications")}
            />

            <MenuDivider />

            <MenuItem
  icon="briefcase-outline"
  title="Mis proyectos"
  subtitle="Administrá los proyectos que publicaste"
  onPress={() => router.push("/my-projects")}
/>

            <MenuDivider />

            <MenuItem
              icon="person-outline"
              title="Mi perfil profesional"
              subtitle="Portfolio, experiencia, equipo y disponibilidad"
              onPress={() => showComingSoon("Mi perfil profesional")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LensUP</Text>

          <View style={styles.menuCard}>
            <MenuItem
              icon="sparkles-outline"
              title="LensUP Score"
              subtitle="Completá tu perfil y mejorá tu visibilidad"
              badge="82%"
              onPress={() => showComingSoon("LensUP Score")}
            />

            <MenuDivider />

            <MenuItem
              icon="car-outline"
              title="Locomoción"
              subtitle={
                profile?.has_transport
                  ? "Marcado: contás con locomoción"
                  : "Indicá si contás con locomoción"
              }
              onPress={() => showComingSoon("Locomoción")}
            />

            <MenuDivider />

            <MenuItem
              icon="shield-checkmark-outline"
              title="Verified Gear"
              subtitle="Equipamiento destacado o verificado"
              onPress={() => showComingSoon("Verified Gear")}
            />
          </View>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons name="mail-outline" size={20} color="#C7A7FF" />
          </View>

          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>Cuenta</Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email || "Sin correo disponible"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={submitting}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.pressed,
            submitting && styles.disabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FF9BA8" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FF9BA8" />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
};

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  badge,
}: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={21} color="#D0B7FF" />
      </View>

      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#66666B" />
      )}
    </Pressable>
  );
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080808",
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
  section: {
    marginTop: 32,
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
  menuItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemPressed: {
    backgroundColor: "#18141E",
  },
  menuIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#251A34",
  },
  menuTextContainer: {
    flex: 1,
    marginHorizontal: 13,
  },
  menuTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  menuSubtitle: {
    marginTop: 4,
    color: "#77777C",
    fontSize: 12,
    lineHeight: 17,
  },
  menuDivider: {
    height: 1,
    marginLeft: 75,
    backgroundColor: "#262629",
  },
  badge: {
    borderWidth: 1,
    borderColor: "#513878",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#241833",
  },
  badgeText: {
    color: "#D6C0FF",
    fontSize: 11,
    fontWeight: "800",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#111113",
  },
  accountIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#251A34",
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountLabel: {
    color: "#77777C",
    fontSize: 11,
    fontWeight: "600",
  },
  email: {
    marginTop: 4,
    color: "#D0D0D3",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#5A292F",
    borderRadius: 17,
    backgroundColor: "#231114",
  },
  signOutText: {
    color: "#FF9BA8",
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.65,
  },
});