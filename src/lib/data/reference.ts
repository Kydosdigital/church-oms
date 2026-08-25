import { createClient } from "@/lib/supabase/server";
import type { Branch, Venue, ServiceType, Minister } from "@/types/domain";

/** Reference data used to populate form selects. All reads are RLS-scoped to
 * the signed-in user's church/branches automatically. */
export async function getReferenceData() {
  const supabase = await createClient();

  const [{ data: branches }, { data: venues }, { data: serviceTypes }, { data: ministers }] =
    await Promise.all([
      supabase.from("branches").select("*").eq("active", true).order("name"),
      supabase.from("venues").select("*").eq("active", true).order("name"),
      supabase.from("service_types").select("*").eq("active", true).order("name"),
      supabase.from("ministers").select("*").eq("active", true).order("full_name"),
    ]);

  return {
    branches: (branches ?? []) as Branch[],
    venues: (venues ?? []) as Venue[],
    serviceTypes: (serviceTypes ?? []) as ServiceType[],
    ministers: (ministers ?? []) as Minister[],
  };
}
