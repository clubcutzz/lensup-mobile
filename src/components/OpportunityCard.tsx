import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Opportunity } from "../data/opportunities";

type OpportunityCardProps = {
  opportunity: Opportunity;
  onPress?: () => void;
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function normalizeRole(role: string) {
  return role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getRoleIcon(role: string): IoniconName {
  const normalizedRole = normalizeRole(role);

  if (
    normalizedRole.includes("fotograf") ||
    normalizedRole.includes("foto")
  ) {
    return "camera-outline";
  }

  if (
    normalizedRole.includes("video") ||
    normalizedRole.includes("filmmaker") ||
    normalizedRole.includes("camarograf") ||
    normalizedRole.includes("operador de camara")
  ) {
    return "videocam-outline";
  }

  if (
    normalizedRole.includes("sonido") ||
    normalizedRole.includes("audio") ||
    normalizedRole.includes("microfon")
  ) {
    return "mic-outline";
  }

  if (
    normalizedRole.includes("ilumin") ||
    normalizedRole.includes("gaffer") ||
    normalizedRole.includes("electrico")
  ) {
    return "bulb-outline";
  }

  if (
    normalizedRole.includes("edicion") ||
    normalizedRole.includes("editor") ||
    normalizedRole.includes("montaj")
  ) {
    return "cut-outline";
  }

  if (
    normalizedRole.includes("color") ||
    normalizedRole.includes("postprodu")
  ) {
    return "color-palette-outline";
  }

  if (
    normalizedRole.includes("drone") ||
    normalizedRole.includes("piloto")
  ) {
    return "airplane-outline";
  }

  if (
    normalizedRole.includes("produccion") ||
    normalizedRole.includes("productor")
  ) {
    return "clipboard-outline";
  }

  if (
    normalizedRole.includes("direccion") ||
    normalizedRole.includes("director")
  ) {
    return "megaphone-outline";
  }

  if (
    normalizedRole.includes("stream") ||
    normalizedRole.includes("multicamara")
  ) {
    return "radio-outline";
  }

  if (
    normalizedRole.includes("maquill") ||
    normalizedRole.includes("styling")
  ) {
    return "brush-outline";
  }

  return "aperture-outline";
}

export function OpportunityCard({
  opportunity,
  onPress,
}: OpportunityCardProps) {
  const projectRoles = opportunity.category
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  const visibleRole =
    projectRoles.length > 0 ? projectRoles[0] : "Rol audiovisual";

  return (
    <View style={styles.card}>
      <View style={styles.visual}>
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />

        <View style={styles.rolesContainer}>
          <View style={styles.roleItem}>
            <View style={styles.roleIcon}>
              <Ionicons
                name={getRoleIcon(visibleRole)}
                size={20}
                color="#FFFFFF"
              />
            </View>

            <Text
              style={styles.roleLabel}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {visibleRole}
            </Text>
          </View>
        </View>

        {opportunity.urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENTE</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.headingContent}>
          <Text style={styles.category}>{opportunity.category}</Text>
          <Text style={styles.title}>{opportunity.title}</Text>
        </View>

        <View style={styles.metadata}>
          <View style={styles.metadataItem}>
            <Ionicons name="location-outline" size={15} color="#8E8E93" />
            <Text style={styles.metadataText}>{opportunity.location}</Text>
          </View>

          <View style={styles.metadataItem}>
            <Ionicons name="calendar-outline" size={15} color="#8E8E93" />
            <Text style={styles.metadataText}>{opportunity.date}</Text>
          </View>
        </View>

        <Text style={styles.budget}>{opportunity.budget}</Text>

        <View style={styles.actionRow}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Ver proyecto</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27232F",
    borderRadius: 26,
    backgroundColor: "#121212",
  },
  visual: {
    height: 104,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101012",
  },
  glowLarge: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#5521A7",
    opacity: 0.1,
    transform: [{ translateX: 75 }, { translateY: -25 }],
  },
  glowSmall: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#9A4DFF",
    opacity: 0.08,
    transform: [{ translateX: -85 }, { translateY: 55 }],
  },
  rolesContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  roleItem: {
    width: "100%",
    alignItems: "center",
  },
  roleIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7651A8",
    borderRadius: 14,
    backgroundColor: "rgba(12, 12, 14, 0.78)",
  },
  roleLabel: {
    maxWidth: "88%",
    marginTop: 6,
    color: "#E3D6FF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  urgentBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderWidth: 1,
    borderColor: "#7F2430",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#331419",
  },
  urgentText: {
    color: "#FF6578",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  content: {
    padding: 18,
  },
  headingContent: {
    flex: 1,
  },
  category: {
    marginBottom: 6,
    color: "#9B7BEA",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
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
    color: "#9B9B9F",
    fontSize: 13,
  },
  budget: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  actionRow: {
    marginTop: 20,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 18,
    backgroundColor: "#712BE3",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});