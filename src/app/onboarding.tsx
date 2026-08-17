import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

const STEPS = ["Foto", "Roles", "Contacto", "Presentación", "Disponibilidad"];

type ProfileDraft = {
  avatar_url: string | null;
  full_name: string | null;
  roles: string[] | string | null;
  city: string | null;
  whatsapp: string | null;
  bio: string | null;
  is_available: boolean | null;
  has_transport: boolean | null;
};

function toRoles(value: ProfileDraft["roles"] | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((role) => role.trim()).filter(Boolean);
  }
  return [];
}

export default function OnboardingScreen() {
  const { user, refreshProfileStatus } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasTransport, setHasTransport] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select(
        "avatar_url, full_name, roles, city, whatsapp, bio, is_available, has_transport",
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          Alert.alert("No pudimos cargar tu perfil", "Intentá nuevamente.");
        }

        const profile = (data as ProfileDraft | null) ?? null;
        const savedRoles = toRoles(profile?.roles);
        const predefinedRoles = savedRoles.filter((role) =>
          PROFILE_ROLES.includes(role as (typeof PROFILE_ROLES)[number]),
        );
        const savedCustomRole = savedRoles.find(
          (role) => !PROFILE_ROLES.includes(role as (typeof PROFILE_ROLES)[number]),
        );

        setAvatarUrl(profile?.avatar_url ?? "");
        setFullName(
          profile?.full_name ??
            (typeof user.user_metadata.full_name === "string"
              ? user.user_metadata.full_name
              : ""),
        );
        setRoles([
          ...predefinedRoles,
          ...(savedCustomRole ? ["Otro"] : []),
        ]);
        setCustomRole(savedCustomRole ?? "");
        setCity(profile?.city ?? "");
        setWhatsapp(profile?.whatsapp ?? "");
        setBio(profile?.bio ?? "");
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

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permiso necesario",
        "Permití el acceso a tus fotos para elegir una imagen de perfil.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setImageMimeType(result.assets[0].mimeType || "image/jpeg");
    }
  }

  function toggleRole(role: string) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  function validateCurrentStep() {
    if (step === 0 && !imageUri && !avatarUrl) {
      Alert.alert("Agregá una foto", "Tu foto ayuda a generar confianza en la red.");
      return false;
    }

    if (step === 1 && selectedRoles.length === 0) {
      Alert.alert("Elegí tu rol", "Seleccioná al menos un rol profesional.");
      return false;
    }

    if (step === 2 && !city.trim()) {
      Alert.alert("Falta tu ciudad", "Indicá dónde trabajás habitualmente.");
      return false;
    }

    if (step === 3 && (!fullName.trim() || bio.trim().length < 40)) {
      Alert.alert(
        "Completá tu presentación",
        "Ingresá tu nombre y una bio de al menos 40 caracteres.",
      );
      return false;
    }

    return true;
  }

  function goForward() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function uploadAvatar() {
    if (!imageUri || !user) return avatarUrl;

    const localFile = new File(imageUri);
    const fileBytes = await localFile.arrayBuffer();
    const extension = imageMimeType === "image/png" ? "png" : "jpg";
    const filePath = `${user.id}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, fileBytes, {
      contentType: imageMimeType,
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    if (!data.publicUrl) throw new Error("No se pudo obtener la foto publicada.");
    return data.publicUrl;
  }

  async function finishOnboarding() {
    if (!user || saving || !validateCurrentStep()) return;

    try {
      setSaving(true);
      const normalizedWhatsapp = whatsapp.replace(/\D/g, "").replace(/^0+/, "");
      const { data: savedProfile, error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          roles: selectedRoles,
          headline: buildProfessionalTitle(selectedRoles),
          city: city.trim(),
          whatsapp: normalizedWhatsapp || null,
          bio: bio.trim(),
          is_available: isAvailable,
          has_transport: hasTransport,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();

      if (profileError) throw new Error(`profile:${profileError.message}`);
      if (!savedProfile) throw new Error("profile:No encontramos el perfil asociado a esta cuenta.");

      const uploadedAvatarUrl = await uploadAvatar().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`avatar:${message}`);
      });

      const { data: savedAvatar, error: avatarProfileError } = await supabase
        .from("profiles")
        .update({ avatar_url: uploadedAvatarUrl })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();

      if (avatarProfileError) throw new Error(`avatar:${avatarProfileError.message}`);
      if (!savedAvatar) throw new Error("avatar:No pudimos asociar la foto al perfil.");

      const completed = await refreshProfileStatus();
      if (!completed) throw new Error("verify:El perfil no quedó completo.");

      router.replace("/");
    } catch (error) {
      console.error("No pudimos completar el onboarding:", error);
      const message = error instanceof Error ? error.message : String(error);
      const [stage, detail] = message.split(/:(.*)/s);
      const descriptions: Record<string, string> = {
        avatar: "Guardamos tus datos, pero no pudimos subir la foto. Elegí otra imagen e intentá nuevamente.",
        profile: "No pudimos guardar los datos del perfil.",
        verify: "Guardamos los datos, pero no pudimos verificar que el perfil esté completo.",
      };
      Alert.alert(
        "No pudimos guardar tu perfil",
        `${descriptions[stage] || "Ocurrió un error al guardar el perfil."}${detail ? `\n\nDetalle: ${detail}` : ""}`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#9A5CFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.progressHeader}>
          <Text style={styles.brand}>Lens<Text style={styles.brandAccent}>UP</Text></Text>
          <Text style={styles.stepCount}>{step + 1} de {STEPS.length}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <Step title="Mostrá quién sos" subtitle="Elegí una foto clara para que la comunidad pueda reconocerte.">
              <Pressable onPress={choosePhoto} style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}>
                {imageUri || avatarUrl ? (
                  <Image source={{ uri: imageUri || avatarUrl }} style={styles.photo} />
                ) : (
                  <Ionicons name="camera-outline" size={46} color="#C7A7FF" />
                )}
                <View style={styles.photoBadge}><Ionicons name="camera" size={19} color="#FFFFFF" /></View>
              </Pressable>
              <Text style={styles.photoHint}>Podés ajustar el encuadre antes de continuar.</Text>
            </Step>
          )}

          {step === 1 && (
            <Step title="¿Cuál es tu rol?" subtitle="Podés seleccionar más de uno.">
              <View style={styles.chips}>
                {PROFILE_ROLES.map((role) => {
                  const selected = roles.includes(role);
                  return (
                    <Pressable key={role} onPress={() => toggleRole(role)} style={[styles.chip, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{role}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {roles.includes("Otro") && (
                <Field label="Tu rol" value={customRole} onChangeText={setCustomRole} placeholder="Ej: Colorista" />
              )}
            </Step>
          )}

          {step === 2 && (
            <Step title="¿Dónde trabajás?" subtitle="Esto ayuda a mostrarte oportunidades cercanas.">
              <CityPicker value={city} onChange={setCity} />
              <Field label="WhatsApp (opcional)" value={whatsapp} onChangeText={setWhatsapp} placeholder="099 123 456" keyboardType="phone-pad" />
            </Step>
          )}

          {step === 3 && (
            <Step title="Contanos sobre vos" subtitle="Una buena presentación mejora tus posibilidades de conectar.">
              <Field label="Nombre completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
              <View style={styles.generatedField}>
                <Text style={styles.label}>Título profesional</Text>
                <Text style={styles.generatedValue}>{buildProfessionalTitle(selectedRoles)}</Text>
                <Text style={styles.generatedHint}>Se genera automáticamente con tus roles.</Text>
              </View>
              <Field label={`Bio · ${bio.trim().length}/40 mínimo`} value={bio} onChangeText={setBio} placeholder="Contá tu experiencia, estilo y el tipo de proyectos que buscás." multiline style={styles.bioInput} />
            </Step>
          )}

          {step === 4 && (
            <Step title="Últimos detalles" subtitle="Podés cambiar estas opciones cuando quieras.">
              <Toggle label="Disponible para trabajar" value={isAvailable} onValueChange={setIsAvailable} />
              <Toggle label="Tengo transporte propio" value={hasTransport} onValueChange={setHasTransport} />
              <View style={styles.readyCard}>
                <Ionicons name="sparkles" size={24} color="#C7A7FF" />
                <View style={styles.readyCopy}>
                  <Text style={styles.readyTitle}>Tu perfil está listo</Text>
                  <Text style={styles.readyText}>Al finalizar vas a entrar al dashboard de LensUP.</Text>
                </View>
              </View>
            </Step>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <Pressable onPress={() => setStep((current) => current - 1)} disabled={saving} style={styles.secondaryButton}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
          ) : <View style={styles.secondaryPlaceholder} />}

          <Pressable
            onPress={step === STEPS.length - 1 ? finishOnboarding : goForward}
            disabled={saving}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}
          >
            {saving ? <ActivityIndicator color="#080808" /> : (
              <>
                <Text style={styles.primaryText}>{step === STEPS.length - 1 ? "Finalizar perfil" : "Continuar"}</Text>
                <Ionicons name="arrow-forward" size={20} color="#080808" />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <View><Text style={styles.eyebrow}>CREÁ TU PERFIL</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text><View style={styles.stepBody}>{children}</View></View>;
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, style, ...props }: FieldProps) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={[styles.input, style]} placeholderTextColor="#666" /></View>;
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggle}><Text style={styles.toggleLabel}>{label}</Text><View style={styles.switchContainer}><Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#333", true: "#7048A7" }} thumbColor={value ? "#C7A7FF" : "#AAA"} style={styles.switchControl} /></View></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#080808" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#080808" },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14 },
  brand: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  brandAccent: { color: "#9A5CFF" },
  stepCount: { color: "#8E8E93", fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 3, backgroundColor: "#202024" },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: "#9A5CFF" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 22, paddingTop: 42, paddingBottom: 36 },
  eyebrow: { color: "#A970FF", fontSize: 12, fontWeight: "800", letterSpacing: 2.2 },
  title: { marginTop: 12, color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -1 },
  subtitle: { marginTop: 10, color: "#9A9A9F", fontSize: 16, lineHeight: 23 },
  stepBody: { marginTop: 34, gap: 18 },
  photoButton: { position: "relative", width: 190, height: 190, alignSelf: "center", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#3B2B54", borderRadius: 95, backgroundColor: "#17121D", overflow: "visible" },
  photo: { width: "100%", height: "100%", borderRadius: 95 },
  photoBadge: { position: "absolute", right: 7, bottom: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#080808", borderRadius: 22, backgroundColor: "#8B4CFF" },
  photoHint: { color: "#77777C", textAlign: "center", fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { borderWidth: 1, borderColor: "#303034", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#131315" },
  chipSelected: { borderColor: "#9A5CFF", backgroundColor: "#2A1940" },
  chipText: { color: "#B0B0B5", fontSize: 14, fontWeight: "700" },
  chipTextSelected: { color: "#E6D7FF" },
  field: { gap: 8 },
  label: { color: "#D4D4D8", fontSize: 14, fontWeight: "700" },
  input: { minHeight: 55, borderWidth: 1, borderColor: "#2B2B2F", borderRadius: 16, paddingHorizontal: 16, backgroundColor: "#121214", color: "#FFFFFF", fontSize: 16 },
  generatedField: { gap: 8 },
  generatedValue: { minHeight: 55, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: "#302841", borderRadius: 16, backgroundColor: "#17131D", color: "#D8C6F7", fontSize: 16, fontWeight: "700" },
  generatedHint: { color: "#77777C", fontSize: 12 },
  bioInput: { minHeight: 130, paddingTop: 15, textAlignVertical: "top" },
  toggle: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#29292D", borderRadius: 17, paddingLeft: 17, paddingRight: 12, backgroundColor: "#121214" },
  toggleLabel: { flex: 1, paddingRight: 16, color: "#E4E4E7", fontSize: 15, fontWeight: "700" },
  switchContainer: { width: 54, height: 40, alignItems: "center", justifyContent: "center" },
  switchControl: { transform: [{ scale: 0.86 }] },
  readyCard: { flexDirection: "row", gap: 14, borderWidth: 1, borderColor: "#473065", borderRadius: 18, padding: 18, backgroundColor: "#1A1224" },
  readyCopy: { flex: 1 },
  readyTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  readyText: { marginTop: 4, color: "#A9A1B3", fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#202024", paddingHorizontal: 22, paddingTop: 14, paddingBottom: Platform.OS === "ios" ? 8 : 18, backgroundColor: "#0B0B0C" },
  secondaryButton: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#303034", borderRadius: 17, backgroundColor: "#151517" },
  secondaryPlaceholder: { width: 56 },
  primaryButton: { flex: 1, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 17, backgroundColor: "#FFFFFF" },
  primaryText: { color: "#080808", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
});
