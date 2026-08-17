import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type SafetyActionsProps = {
  targetUserId: string | null | undefined;
  contentType: "profile" | "project";
  contentId: string;
  targetLabel: string;
  onBlocked: () => void;
};

const REPORT_REASONS = [
  "Contenido ofensivo",
  "Spam o fraude",
  "Acoso o comportamiento abusivo",
  "Contenido inapropiado",
] as const;

export default function SafetyActions({
  targetUserId,
  contentType,
  contentId,
  targetLabel,
  onBlocked,
}: SafetyActionsProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const userId = user?.id;

  if (!userId || !targetUserId || targetUserId === userId) return null;

  async function report(reason: (typeof REPORT_REASONS)[number]) {
    try {
      setSubmitting(true);
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: userId,
        reported_user_id: targetUserId,
        content_type: contentType,
        content_id: contentId,
        reason,
      });

      if (error) throw error;
      Alert.alert(
        "Denuncia recibida",
        "Gracias por ayudarnos a mantener segura la comunidad. Revisaremos el contenido.",
      );
    } catch (error) {
      console.error("No se pudo enviar la denuncia:", error);
      Alert.alert(
        "No pudimos enviar la denuncia",
        "Intentá nuevamente en unos minutos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function chooseReportReason() {
    Alert.alert(
      "¿Qué querés denunciar?",
      "La denuncia es confidencial.",
      [
        ...REPORT_REASONS.map((reason) => ({
          text: reason,
          onPress: () => report(reason),
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
    );
  }

  function confirmBlock() {
    Alert.alert(
      `Bloquear a ${targetLabel}`,
      "Ya no verás su perfil, sus proyectos ni su contenido. Podrás desbloquearlo desde Configuración.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: blockUser,
        },
      ],
    );
  }

  async function blockUser() {
    try {
      setSubmitting(true);
      const { error } = await supabase.from("user_blocks").upsert(
        {
          blocker_id: userId,
          blocked_id: targetUserId,
        },
        { onConflict: "blocker_id,blocked_id" },
      );

      if (error) throw error;
      Alert.alert("Usuario bloqueado", "Este contenido dejará de aparecer.", [
        { text: "Aceptar", onPress: onBlocked },
      ]);
    } catch (error) {
      console.error("No se pudo bloquear al usuario:", error);
      Alert.alert(
        "No pudimos bloquear al usuario",
        "Intentá nuevamente en unos minutos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openMenu() {
    Alert.alert("Seguridad", targetLabel, [
      { text: "Denunciar contenido", onPress: chooseReportReason },
      { text: "Bloquear usuario", style: "destructive", onPress: confirmBlock },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Opciones de seguridad para ${targetLabel}`}
      disabled={submitting}
      onPress={openMenu}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 15,
    backgroundColor: "#121214",
  },
  pressed: { opacity: 0.7 },
});
