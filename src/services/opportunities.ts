import type { Opportunity } from "../data/opportunities";
import { supabase } from "../lib/supabase";

type ProjectRow = {
  id: string;
  title?: string | null;
  category?: string | null;
  city?: string | null;
  location?: string | null;
  project_date?: string | null;
  date?: string | null;
  budget?: number | string | null;
  duration_hours?: number | null;
  is_urgent?: boolean | null;
  urgent?: boolean | null;
  description?: string | null;
  specialties?: string[] | null;
  tags?: string[] | null;
  client_name?: string | null;
  company_name?: string | null;
  created_at?: string | null;
};

function formatBudget(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "A convenir";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `UYU ${numericValue.toLocaleString("es-UY")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Fecha a coordinar";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-UY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mapProjectToOpportunity(project: ProjectRow): Opportunity {
  const tags = project.tags ?? project.specialties ?? [];

  return {
    id: project.id,
    title: project.title?.trim() || "Proyecto sin título",
    category: project.category?.trim() || "Producción audiovisual",
    location:
      project.city?.trim() ||
      project.location?.trim() ||
      "Ubicación a coordinar",
    date: formatDate(project.project_date ?? project.date),
    budget: formatBudget(project.budget),
    durationHours: project.duration_hours ?? 1,
    match: 90,
    urgent: Boolean(project.is_urgent ?? project.urgent),
    client:
      project.company_name?.trim() ||
      project.client_name?.trim() ||
      "Cliente de LensUP",
    description:
      project.description?.trim() ||
      "El cliente todavía no agregó una descripción detallada.",
    reasons: [
      "Coincide con tu perfil profesional",
      "Está disponible en LensUP",
      "Podés postularte desde tu perfil",
    ],
    tags,
  };
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((project) =>
    mapProjectToOpportunity(project as ProjectRow)
  );
}