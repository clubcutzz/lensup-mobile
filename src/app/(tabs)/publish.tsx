import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import CityPicker from "../../components/CityPicker";
import { PROFILE_ROLES } from "../../constants/profile";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

type Currency = "UYU" | "USD" | "A_CONVENIR";

const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function parseEventDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(DATE_PATTERN);
  if (!match) throw new Error("Ingresá la fecha con formato DD/MM/AAAA.");

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoDate}T12:00:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getDate() !== Number(day)
  ) {
    throw new Error("La fecha ingresada no es válida.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) throw new Error("La fecha del proyecto no puede estar en el pasado.");

  return isoDate;
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function PublishProjectScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [currency, setCurrency] = useState<Currency>("UYU");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRoles = useMemo(() => {
    const standardRoles = roles.filter((role) => role !== "Otro");
    const other = customRole.trim();
    return other ? [...standardRoles, other] : standardRoles;
  }, [customRole, roles]);

  function toggleRole(role: string) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  function resetForm() {
    setTitle("");
    setRoles([]);
    setCustomRole("");
    setCity("");
    setEventDate("");
    setCurrency("UYU");
    setBudgetAmount("");
    setDescription("");
    setDeliverables("");
    setReferenceLinks("");
    setUrgent(false);
  }

  async function handlePublish() {
    if (!user) return;
    if (!title.trim()) {
      Alert.alert("Falta el título", "Escribí un título claro para el proyecto.");
      return;
    }
    if (selectedRoles.length === 0) {
      Alert.alert("Falta el rol", "Seleccioná al menos un rol que estés buscando.");
      return;
    }
    if (!city) {
      Alert.alert("Falta la ciudad", "Seleccioná dónde se realizará el proyecto.");
      return;
    }
    if (description.trim().length < 30) {
      Alert.alert("Brief muy corto", "Contá un poco más sobre el proyecto (mínimo 30 caracteres).");
      return;
    }
    if (currency !== "A_CONVENIR" && !budgetAmount) {
      Alert.alert("Falta el presupuesto", "Ingresá un monto o seleccioná “A convenir”.");
      return;
    }

    try {
      const parsedDate = parseEventDate(eventDate);
      setSaving(true);

      const budget =
        currency === "A_CONVENIR" ? "A convenir" : `${currency}:${budgetAmount}`;

      const { data, error } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          role: selectedRoles.join(", "),
          city,
          event_date: parsedDate,
          budget,
          description: description.trim(),
          deliverables: deliverables.trim() || null,
          reference_links: referenceLinks.trim() || null,
          urgent,
        })
        .select("id")
        .single();

      if (error) throw error;

      resetForm();
      Alert.alert(
        "Proyecto publicado",
        "Tu oportunidad ya está visible para la comunidad de LensUP.",
        [
          {
            text: "Ver proyecto",
            onPress: () =>
              router.push({ pathname: "/project/[id]", params: { id: data.id } }),
          },
          { text: "Mis proyectos", onPress: () => router.push("/my-projects") },
        ],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("No pudimos publicar", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={70}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>NUEVA OPORTUNIDAD</Text>
              <Text style={styles.title}>Publicar proyecto</Text>
            </View>
            <View style={styles.headerIcon}><Ionicons name="megaphone-outline" size={23} color="#C7A7FF" /></View>
          </View>

          <Text style={styles.intro}>Encontrá al equipo ideal contando de forma clara qué necesitás.</Text>

          <Section number="1" title="Lo esencial">
            <Field label="Título del proyecto" value={title} onChangeText={setTitle} placeholder="Ej: Videógrafo para DJ Set" maxLength={90} />
            <Text style={styles.fieldLabel}>Roles buscados</Text>
            <View style={styles.chips}>
              {PROFILE_ROLES.map((role) => {
                const selected = roles.includes(role);
                return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={role} onPress={() => toggleRole(role)} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{role}</Text></Pressable>;
              })}
            </View>
            {roles.includes("Otro") ? <Field label="Otro rol" value={customRole} onChangeText={setCustomRole} placeholder="Ej: Colorista" /> : null}
            <CityPicker value={city} onChange={setCity} />
          </Section>

          <Section number="2" title="Fecha y presupuesto">
            <Field label="Fecha del evento (opcional)" value={eventDate} onChangeText={(value) => setEventDate(formatDateInput(value))} placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10} />
            <Text style={styles.fieldLabel}>Moneda</Text>
            <View style={styles.currencyRow}>
              {(["UYU", "USD", "A_CONVENIR"] as Currency[]).map((option) => {
                const selected = option === currency;
                return <Pressable key={option} onPress={() => setCurrency(option)} style={[styles.currencyButton, selected && styles.currencyButtonSelected]}><Text style={[styles.currencyText, selected && styles.currencyTextSelected]}>{option === "A_CONVENIR" ? "A convenir" : option}</Text></Pressable>;
              })}
            </View>
            {currency !== "A_CONVENIR" ? <Field label="Monto" value={budgetAmount} onChangeText={(value) => setBudgetAmount(value.replace(/\D/g, ""))} placeholder={currency === "UYU" ? "20000" : "500"} keyboardType="number-pad" /> : null}
          </Section>

          <Section number="3" title="Detalles">
            <Field label="Brief del proyecto" value={description} onChangeText={setDescription} placeholder="Tipo de producción, horarios, contexto y cualquier detalle importante..." multiline maxLength={1200} />
            <Text style={styles.counter}>{description.length}/1200</Text>
            <Field label="Material a entregar (opcional)" value={deliverables} onChangeText={setDeliverables} placeholder="Ej: 10 clips verticales y 20 fotografías editadas" multiline maxLength={700} />
            <Field label="Referencias (opcional)" value={referenceLinks} onChangeText={setReferenceLinks} placeholder="Links de Instagram, YouTube, Vimeo…" multiline autoCapitalize="none" maxLength={1000} />
          </Section>

          <View style={[styles.urgentCard, urgent && styles.urgentCardActive]}>
            <View style={styles.urgentCopy}>
              <View style={styles.urgentTitleRow}><Ionicons name="flash" size={18} color="#FF7586" /><Text style={styles.urgentTitle}>Cobertura urgente</Text></View>
              <Text style={styles.urgentText}>Activalo solo cuando necesites cubrir el proyecto rápidamente.</Text>
            </View>
            <View style={styles.switchContainer}><Switch value={urgent} onValueChange={setUrgent} trackColor={{ false: "#333338", true: "#7C3AED" }} thumbColor={urgent ? "#DFC9FF" : "#B0B0B4"} style={styles.switchControl} /></View>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Publicar proyecto" disabled={saving} onPress={handlePublish} style={({ pressed }) => [styles.publishButton, pressed && styles.pressed, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#080808" /> : <><Text style={styles.publishText}>Publicar proyecto</Text><Ionicons name="arrow-forward" size={21} color="#080808" /></>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{number}</Text></View><Text style={styles.sectionTitle}>{title}</Text></View><View style={styles.sectionBody}>{children}</View></View>;
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

function Field({ label, multiline, style, ...props }: FieldProps) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#5F5F65" style={[styles.input, multiline && styles.textarea, style]} textAlignVertical={multiline ? "top" : "center"} /></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#080808" },
  flex: { flex: 1 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 18, paddingHorizontal: 18, paddingTop: Platform.OS === "web" ? 28 : 12, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#A765FF", fontSize: 11, fontWeight: "900", letterSpacing: 2.2 },
  title: { marginTop: 5, color: "#FFF", fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  headerIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#21162F" },
  intro: { color: "#8C8C92", fontSize: 14, lineHeight: 21 },
  section: { borderWidth: 1, borderColor: "#29292D", borderRadius: 22, padding: 17, backgroundColor: "#111113" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  sectionNumber: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#2A1940" },
  sectionNumberText: { color: "#D8C1FF", fontSize: 13, fontWeight: "900" },
  sectionTitle: { color: "#F4F4F5", fontSize: 17, fontWeight: "900" },
  sectionBody: { marginTop: 18, gap: 16 },
  field: { gap: 8 },
  fieldLabel: { color: "#D4D4D8", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 54, borderWidth: 1, borderColor: "#303034", borderRadius: 15, paddingHorizontal: 15, backgroundColor: "#0C0C0E", color: "#FFF", fontSize: 16 },
  textarea: { minHeight: 112, paddingTop: 15, paddingBottom: 15 },
  counter: { marginTop: -8, color: "#707076", textAlign: "right", fontSize: 11 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { borderWidth: 1, borderColor: "#303034", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: "#0C0C0E" },
  chipSelected: { borderColor: "#8B4CFF", backgroundColor: "#2A1940" },
  chipText: { color: "#A8A8AD", fontSize: 13, fontWeight: "700" },
  chipTextSelected: { color: "#E6D7FF" },
  currencyRow: { flexDirection: "row", gap: 8 },
  currencyButton: { flex: 1, minHeight: 45, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#303034", borderRadius: 13, backgroundColor: "#0C0C0E" },
  currencyButtonSelected: { borderColor: "#8B4CFF", backgroundColor: "#2A1940" },
  currencyText: { color: "#8F8F95", fontSize: 12, fontWeight: "800" },
  currencyTextSelected: { color: "#E6D7FF" },
  urgentCard: { minHeight: 92, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#3A3033", borderRadius: 20, paddingLeft: 17, paddingRight: 10, paddingVertical: 15, backgroundColor: "#121012" },
  urgentCardActive: { borderColor: "#743848", backgroundColor: "#1A1014" },
  urgentCopy: { flex: 1, paddingRight: 12 },
  urgentTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  urgentTitle: { color: "#F2E9EC", fontSize: 15, fontWeight: "800" },
  urgentText: { marginTop: 5, color: "#8C7D82", fontSize: 12, lineHeight: 17 },
  switchContainer: { width: 54, height: 42, alignItems: "center", justifyContent: "center" },
  switchControl: { transform: [{ scale: 0.86 }] },
  publishButton: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 18, backgroundColor: "#FFF" },
  publishText: { color: "#080808", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
});
