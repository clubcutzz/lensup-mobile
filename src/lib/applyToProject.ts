import { supabase } from "./supabase";

type ApplyToProjectParams = {
  projectId: string;
  projectOwnerId: string | null;
  projectTitle: string | null;
  profileId: string;
  notificationLink?: string;
};

type ApplyToProjectResult =
  | {
      ok: true;
      alreadyApplied: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export async function applyToProject({
  projectId,
  projectOwnerId,
  projectTitle,
  profileId,
  notificationLink = "/my-projects",
}: ApplyToProjectParams): Promise<ApplyToProjectResult> {
  const { error: applicationError } = await supabase
    .from("applications")
    .insert({
      project_id: projectId,
      profile_id: profileId,
    });

  if (applicationError) {
    if (applicationError.code === "23505") {
      return {
        ok: true,
        alreadyApplied: true,
      };
    }

    return {
      ok: false,
      message: applicationError.message,
    };
  }

  const { data: applicant } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .single();

  if (projectOwnerId) {
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: projectOwnerId,
        title: "🙋 Nueva postulación",
        message: `${
          applicant?.full_name || "Un profesional"
        } se postuló a "${projectTitle || "tu proyecto"}".`,
        type: "application",
        link: notificationLink,
      });

    if (notificationError) {
      console.log("Notification error:", notificationError);
    }
  }

  return {
    ok: true,
    alreadyApplied: false,
  };
}

export async function hasAppliedToProject(
  projectId: string,
  profileId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("project_id", projectId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.log("Application check error:", error);
    return false;
  }

  return Boolean(data);
}