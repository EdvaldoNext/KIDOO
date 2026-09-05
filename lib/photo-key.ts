export const STORAGE_BUCKET = "task-photos";
export const STORAGE_PROVIDER = "supabase" as const;

export function photoKey(familyId: string, childId: string, completionId: string) {
  return `families/${familyId}/children/${childId}/completions/${completionId}.jpg`;
}
