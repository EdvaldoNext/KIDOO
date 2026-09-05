"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type FamilyRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
  children_count: number;
  created_at: string;
  owner_name: string | null;
};

export function FamiliesTable({ families }: { families: FamilyRow[] }) {
  const router = useRouter();

  async function toggle(id: string, status: string) {
    const supabase = createClient();
    await supabase.rpc("set_family_status", {
      p_family_id: id,
      p_status: status === "active" ? "disabled" : "active",
    });
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-navy/5">
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas font-bold">
          <tr>
            <th className="px-4 py-3">Família</th>
            <th className="px-4 py-3">Titular</th>
            <th className="px-4 py-3">Plano</th>
            <th className="px-4 py-3">Filhos</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {families.map((family) => (
            <tr key={family.id} className="border-t border-navy/5">
              <td className="px-4 py-3 font-bold">{family.name}</td>
              <td className="px-4 py-3">{family.owner_name ?? "—"}</td>
              <td className="px-4 py-3">{family.plan}</td>
              <td className="px-4 py-3">{family.children_count}</td>
              <td className="px-4 py-3">{family.status}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggle(family.id, family.status)}
                  className="font-bold text-royal"
                >
                  {family.status === "active" ? "Desativar" : "Reativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
