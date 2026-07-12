import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase-client";
import { useSession } from "./use-session";

/**
 * Client-side convenience check for showing/hiding admin UI. This is a UX
 * nicety only — the real security boundary is Row Level Security on every
 * table (has_role() checks in the policies), which is enforced regardless
 * of what this hook returns. A user could not bypass RLS even if this hook
 * were tricked into returning true.
 */
export function useIsSuperAdmin() {
  const { user, loading: sessionLoading } = useSession();

  const { data: isSuperAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "super_admin",
      });
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
  });

  return { isSuperAdmin: !!isSuperAdmin, loading: sessionLoading || (!!user && roleLoading) };
}
