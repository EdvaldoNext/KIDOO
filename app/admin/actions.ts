"use server";

import { createClient } from "@/utils/supabase/server";

export async function runCloseMonth() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_month");
  if (error) throw error;
}
