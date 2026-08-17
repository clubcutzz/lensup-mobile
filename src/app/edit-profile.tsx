import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import CityPicker from "../components/CityPicker";
import { buildProfessionalTitle, PROFILE_ROLES } from "../constants/profile";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type EditableProfile = {
  full_name: string | null;
  roles: string[] | string | null;
  city: string | null;
  bio: string | null;
  whatsapp: string | null;
  is_available: boolean | null;
  has_transport: boolean | null;
};

function toRoles(value: EditableProfile["roles"]) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((role) => role.trim()).filter(Boolean);
  return [];
}

export default function EditProfileScreen() {
  const { user, refreshProfileStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasTransport, setHasTransport] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("full_name, roles, city, bio, whatsapp, is_available, has_transport")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) Alert.alert("No pudimos cargar tu perfil", error.message);

        const profile = (data as EditableProfile | null) ?? null;
        const savedRoles = toRoles(profile?.roles ?? null);
        const standardRoles = savedRoles.filter((role) =>
          PROFILE_ROLES.includes(role as (typeof PROFILE_ROLES)[number]),
        );
        const savedCustomRole = savedRoles.find(
          (role) => !PROFILE_ROLES.includes(role as (typeof PROFILE_ROLES)[number]),
        );

        setFullName(profile?.full_name || "");
        setRoles([...standardRoles, ...(savedCustomRole ? ["Otro"] : [])]);
        setCustomRole(savedCustomRole || "");
        setCity(profile?.city || "");
        setBio(profile?.bio || "");
        setWhatsapp(profile?.whatsapp || "");
        setIsAvailable(profile?.is_available !== false);
        setHasTransport(Boolean(profile?.has_transport));
        setLoading(false);
      });
  }, [user]);

  const selectedRoles = useMemo(() => {
    const standardRoles = roles.filter((role) => role !== "Otro");
    const cleanCustomRole = customRole.trim();
    return cleanCustomRole ? [...standardRoles, cleanCustomRole] : standardRoles;
  }, [customRole, roles]);

  const professionalTitle = buildProfessionalTitle(selectedRoles);

  function toggleRole(role: string) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  async function handleSave() {
    if (!user || !fullName.trim()) {
      Alert.alert("Falta tu nombre", "Ingresá tu nombre para guardar el perfil.");
      return;
    }

    if (selectedRoles.length === 0) {
      Alert.alert("Falta tu rol", "Seleccioná al menos un rol profesional.");
      return;
    }

    if (!city) {
      Alert.alert("Falta tu ciudad", "Seleccioná una ciudad de Uruguay.");
      return;
    }

    const normalizedWhatsapp = whatsapp.replace(/\D/g, "").replace(/^0+/, "");

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          roles: selectedRoles,
          headline: professionalTitle,
          city,
          bio: bio.trim() || null,
          whatsapp: normalizedWhatsapp || null,
          is_available: isAvailable,
          has_transport: hasTransport,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No encontramos el perfil asociado a tu cuenta.");

      await refreshProfileStatus();
      Alert.alert("Perfil actualizado", "Tus cambios ya están publicados.", [
        { text: "Listo", onPress: () => router.back() },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      Alert.alert("No pudimos guardar", detail);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#9A5CFF" size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>TU PERFIL</Text><Text style={styles.title}>Editar información</Text></View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Section icon="person-outline" title="Identidad" description="La información principal de tu perfil profesional.">
            <Field label="Nombre completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          </Section>

          <Section icon="videocam-outline" title="Roles" description="Seleccioná todas las tareas que realizás.">
            <View style={styles.chips}>
              {PROFILE_ROLES.map((role) => {
                const selected = roles.includes(role);
                return <Pressable key={role} onPress={() => toggleRole(role)} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{role}</Text></Pressable>;
              })}
            </View>
            {roles.includes("Otro") ? <Field label="Tu rol" value={customRole} onChangeText={setCustomRole} placeholder="Ej: Colorista" /> : null}
            <View style={styles.generatedCard}>
              <Text style={styles.generatedLabel}>Título profesional automático</Text>
              <Text style={styles.generatedTitle}>{professionalTitle || "Seleccioná al menos un rol"}</Text>
            </View>
          </Section>

          <Section icon="location-outline" title="Ubicación y contacto" description="Datos que ayudan a encontrarte y contactarte.">
            <CityPicker value={city} onChange={setCity} />
            <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="099 123 456" keyboardType="phone-pad" />
          </Section>

          <Section icon="document-text-outline" title="Presentación" description="Contá brevemente tu experiencia y qué proyectos buscás.">
            <Field label="Bio" value={bio} onChangeText={setBio} multiline style={styles.bioInput} placeholder="Tu experiencia, estilo y objetivos profesionales" />
            <Text style={[styles.counter, bio.trim().length >= 40 && styles.counterReady]}>{bio.trim().length} caracteres · recomendamos al menos 40</Text>
          </Section>

          <Section icon="options-outline" title="Disponibilidad" description="Estas opciones aparecen en tu perfil público.">
            <Toggle label="Disponible para trabajar" value={isAvailable} onValueChange={setIsAvailable} />
            <Toggle label="Tengo transporte propio" value={hasTransport} onValueChange={setHasTransport} />
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#080808" /> : <><Text style={styles.saveText}>Guardar cambios</Text><Ionicons name="checkmark" size={21} color="#080808" /></>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ icon, title, description, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionIcon}><Ionicons name={icon} size={20} color="#C7A7FF" /></View><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDescription}>{description}</Text></View></View><View style={styles.sectionBody}>{children}</View></View>;
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, style, ...props }: FieldProps) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={[styles.input, style]} placeholderTextColor="#66666B" /></View>;
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggle}><Text style={styles.toggleLabel}>{label}</Text><View style={styles.switchContainer}><Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#333", true: "#7048A7" }} thumbColor={value ? "#C7A7FF" : "#AAA"} style={styles.switchControl} /></View></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#080808" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#080808" },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#202024" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#29292C", borderRadius: 15, backgroundColor: "#121214" },
  headerCopy: { flex: 1, alignItems: "center" },
  headerSpacer: { width: 44 },
  eyebrow: { color: "#9A5CFF", fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  title: { marginTop: 2, color: "#FFF", fontSize: 19, fontWeight: "900" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 18, paddingBottom: 30, gap: 16 },
  section: { borderWidth: 1, borderColor: "#29292D", borderRadius: 22, padding: 17, backgroundColor: "#111113" },
  sectionHeader: { flexDirection: "row", gap: 12 },
  sectionIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#21162F" },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: "#F4F4F5", fontSize: 17, fontWeight: "900" },
  sectionDescription: { marginTop: 4, color: "#85858A", fontSize: 13, lineHeight: 18 },
  sectionBody: { marginTop: 18, gap: 16 },
  field: { gap: 8 },
  label: { color: "#D4D4D8", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 54, borderWidth: 1, borderColor: "#303034", borderRadius: 15, paddingHorizontal: 15, backgroundColor: "#0C0C0E", color: "#FFF", fontSize: 16 },
  bioInput: { minHeight: 120, paddingTop: 15, textAlignVertical: "top" },
  counter: { marginTop: -8, color: "#77777C", textAlign: "right", fontSize: 11 },
  counterReady: { color: "#75C99A" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { borderWidth: 1, borderColor: "#303034", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#0C0C0E" },
  chipSelected: { borderColor: "#8B4CFF", backgroundColor: "#2A1940" },
  chipText: { color: "#A8A8AD", fontSize: 13, fontWeight: "700" },
  chipTextSelected: { color: "#E6D7FF" },
  generatedCard: { borderWidth: 1, borderColor: "#3B2D50", borderRadius: 15, padding: 14, backgroundColor: "#191321" },
  generatedLabel: { color: "#8D7D9F", fontSize: 11, fontWeight: "700" },
  generatedTitle: { marginTop: 6, color: "#E0CFFF", fontSize: 15, fontWeight: "800" },
  toggle: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#303034", borderRadius: 16, paddingLeft: 15, paddingRight: 10, backgroundColor: "#0C0C0E" },
  toggleLabel: { flex: 1, paddingRight: 14, color: "#E4E4E7", fontSize: 14, fontWeight: "700" },
  switchContainer: { width: 54, height: 40, alignItems: "center", justifyContent: "center" },
  switchControl: { transform: [{ scale: 0.86 }] },
  footer: { borderTopWidth: 1, borderTopColor: "#202024", paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 8 : 16, backgroundColor: "#0B0B0C" },
  saveButton: { height: 55, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 17, backgroundColor: "#FFF" },
  saveText: { color: "#080808", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
});
