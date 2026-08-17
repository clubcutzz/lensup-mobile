import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { URUGUAY_CITIES, type UruguayCity } from "../constants/profile";

type CityPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function CityPicker({ value, onChange }: CityPickerProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  const filteredCities = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return URUGUAY_CITIES;

    return URUGUAY_CITIES.filter((city) =>
      normalize(`${city.name} ${city.department}`).includes(normalizedQuery),
    );
  }, [query]);

  function chooseCity(city: UruguayCity) {
    onChange(city.name);
    setVisible(false);
    setQuery("");
  }

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Ciudad</Text>
        <Pressable onPress={() => setVisible(true)} style={styles.selector}>
          <Ionicons name="location-outline" size={20} color="#A970FF" />
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value || "Seleccioná tu ciudad"}
          </Text>
          <Ionicons name="chevron-down" size={19} color="#77777C" />
        </Pressable>
      </View>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>URUGUAY</Text>
              <Text style={styles.modalTitle}>Elegí tu ciudad</Text>
            </View>
            <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={23} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#77777C" />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ciudad o departamento"
              placeholderTextColor="#66666B"
              style={styles.searchInput}
            />
          </View>

          <FlatList
            data={filteredCities}
            keyExtractor={(item, index) => `${item.department}-${item.name}-${index}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable onPress={() => chooseCity(item)} style={styles.cityRow}>
                <View style={styles.cityIcon}>
                  <Ionicons name="location" size={17} color="#C7A7FF" />
                </View>
                <View style={styles.cityCopy}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.department}>{item.department}</Text>
                </View>
                {value === item.name ? <Ionicons name="checkmark-circle" size={22} color="#9A5CFF" /> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No encontramos esa localidad.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: "#D4D4D8", fontSize: 14, fontWeight: "700" },
  selector: { minHeight: 55, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "#2B2B2F", borderRadius: 16, paddingHorizontal: 16, backgroundColor: "#121214" },
  value: { flex: 1, color: "#FFFFFF", fontSize: 16 },
  placeholder: { color: "#66666B" },
  modalSafeArea: { flex: 1, backgroundColor: "#080808" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  modalEyebrow: { color: "#9A5CFF", fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  modalTitle: { marginTop: 4, color: "#FFFFFF", fontSize: 25, fontWeight: "900" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#303034", borderRadius: 15, backgroundColor: "#151517" },
  searchBox: { height: 54, flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, borderWidth: 1, borderColor: "#303034", borderRadius: 16, paddingHorizontal: 15, backgroundColor: "#121214" },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
  cityRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#29292D" },
  cityIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#21162F" },
  cityCopy: { flex: 1 },
  cityName: { color: "#F4F4F5", fontSize: 16, fontWeight: "700" },
  department: { marginTop: 3, color: "#77777C", fontSize: 12 },
  empty: { paddingVertical: 50, color: "#8E8E93", textAlign: "center", fontSize: 15 },
});
