import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Opportunity } from "../data/opportunities";

type OpportunityCardProps = {
  opportunity: Opportunity;
  onPress?: () => void;
};

export function OpportunityCard({
  opportunity,
  onPress,
}: OpportunityCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.visual}>
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />

        <View style={styles.cameraIcon}>
          <Ionicons name="videocam" size={34} color="#FFFFFF" />
        </View>

        {opportunity.urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENTE</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.headingContent}>
            <Text style={styles.category}>{opportunity.category}</Text>
            <Text style={styles.title}>{opportunity.title}</Text>
          </View>

          <View style={styles.matchBadge}>
            <Ionicons name="sparkles" size={13} color="#C4A7FF" />
            <Text style={styles.matchText}>{opportunity.match}%</Text>
          </View>
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

        <View style={styles.divider} />

        <Text style={styles.whyTitle}>Por qué encaja con vos</Text>

        <View style={styles.reasons}>
          {opportunity.reasons.slice(0, 3).map((reason) => (
            <View key={reason} style={styles.reason}>
              <View style={styles.check}>
                <Ionicons name="checkmark" size={11} color="#0A0A0A" />
              </View>

              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Guardar oportunidad"
            style={({ pressed }) => [
              styles.favoriteButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="heart-outline" size={21} color="#FFFFFF" />
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
    height: 190,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101012",
  },
  glowLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#5521A7",
    opacity: 0.3,
    transform: [{ translateX: 70 }, { translateY: -20 }],
  },
  glowSmall: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#9A4DFF",
    opacity: 0.22,
    transform: [{ translateX: -70 }, { translateY: 60 }],
  },
  cameraIcon: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7651A8",
    borderRadius: 24,
    backgroundColor: "rgba(12, 12, 14, 0.76)",
  },
  urgentBadge: {
    position: "absolute",
    top: 16,
    right: 16,
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
    padding: 20,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#43345B",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#21192E",
  },
  matchText: {
    color: "#D8C6FF",
    fontSize: 12,
    fontWeight: "800",
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
  divider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: "#28282B",
  },
  whyTitle: {
    color: "#D3D3D7",
    fontSize: 13,
    fontWeight: "700",
  },
  reasons: {
    gap: 10,
    marginTop: 12,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  check: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#A676FF",
  },
  reasonText: {
    flex: 1,
    color: "#A9A9AE",
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 16,
    backgroundColor: "#712BE3",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  favoriteButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333337",
    borderRadius: 16,
    backgroundColor: "#19191B",
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
