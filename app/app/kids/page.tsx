import { KidsChildMissions } from "@/components/kids/KidsTaskCard";
import { KidsMascot } from "@/components/kids/KidsMascot";
import { latestRejectionByTask } from "@/components/tasks/RejectionFeedback";
import { getAppContext } from "@/lib/app-context";
import { loadFamilyReward } from "@/lib/rewards";

export default async function KidsHomePage() {
  const { supabase, familyId, childId, devMode } = await getAppContext();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, weight, kind, require_photo, assigned_child_id, due_at")
    .in("status", ["pending", "awaiting_approval"])
    .order("created_at", { ascending: false });

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "child")
    .order("created_at", { ascending: true });

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const [{ data: tasks }, { data: children }, reward] = await Promise.all([
    tasksQuery,
    childrenQuery,
    loadFamilyReward(supabase, familyId),
  ]);
  const kids = children ?? [];
  const openTasks = tasks ?? [];

  const pendingTaskIds = openTasks.filter((task) => task.status === "pending").map((task) => task.id);
  let rejectionsByTask = new Map<string, string | null>();

  if (pendingTaskIds.length > 0) {
    let rejectionsQuery = supabase
      .from("task_completions")
      .select("task_id, rejection_note, rejected_at")
      .in("task_id", pendingTaskIds)
      .not("rejected_at", "is", null)
      .order("rejected_at", { ascending: false });

    if (familyId) rejectionsQuery = rejectionsQuery.eq("family_id", familyId);

    const { data: rejections } = await rejectionsQuery;
    rejectionsByTask = latestRejectionByTask(rejections ?? []);
  }

  const canView = devMode || Boolean(childId);
  const manyKids = kids.length > 1;
  const orderedKids = [
    ...kids.filter((kid) => kid.id === childId),
    ...kids.filter((kid) => kid.id !== childId),
  ];

  return (
    <div className="space-y-6">
      {!canView ? (
        <div className="rounded-3xl bg-white p-8">
          <KidsMascot size="hero" caption="Peça aos pais o link e a chave da família para entrar." />
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold sm:text-xl">
            {manyKids ? "Missões da família" : "Suas missões"}
          </h2>
          {kids.length === 0 ? null : manyKids ? (
            orderedKids.map((kid) => (
              <KidsChildMissions
                key={kid.id}
                kid={kid}
                isYou={kid.id === childId}
                tasks={openTasks.filter((task) => task.assigned_child_id === kid.id)}
                reward={reward}
                rejectionsByTask={rejectionsByTask}
              />
            ))
          ) : openTasks.length === 0 ? (
            <div className="rounded-3xl bg-white p-8">
              <KidsMascot size="hero" caption="Mandou bem! Nenhuma missão agora." />
            </div>
          ) : (
            <KidsChildMissions
              kid={kids[0]}
              isYou={!childId || kids[0].id === childId}
              tasks={openTasks}
              reward={reward}
              rejectionsByTask={rejectionsByTask}
            />
          )}
        </section>
      )}
    </div>
  );
}
