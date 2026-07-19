import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, ShieldCheck, Star, UserCheck, Users } from "lucide-react";

type AppRole = "admin" | "moderator" | "user";
type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  roles: AppRole[] | null;
};

const roleLabels: Record<AppRole, string> = {
  admin: "এডমিন",
  moderator: "মডারেটর",
  user: "ইউজার",
};

const roleOrder: AppRole[] = ["admin", "moderator", "user"];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole | "verified">("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-advanced"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users" as any);
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const roles = user.roles ?? [];
      const matchesQuery = !needle ||
        user.display_name?.toLowerCase().includes(needle) ||
        user.email?.toLowerCase().includes(needle) ||
        user.bio?.toLowerCase().includes(needle);
      const matchesRole = roleFilter === "all" ||
        (roleFilter === "verified" ? user.is_verified : roles.includes(roleFilter));
      return matchesQuery && matchesRole;
    });
  }, [users, query, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.roles?.includes("admin")).length,
    moderators: users.filter((u) => u.roles?.includes("moderator")).length,
    verified: users.filter((u) => u.is_verified).length,
  }), [users]);

  const toggleVerified = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: string; isVerified: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_verified" as any, {
        _target_user_id: userId,
        _is_verified: isVerified,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-advanced"] });
      toast.success("ভেরিফিকেশন আপডেট হয়েছে");
    },
    onError: (error: any) => toast.error(error.message || "আপডেট ব্যর্থ"),
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, enabled }: { userId: string; role: AppRole; enabled: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_role" as any, {
        _target_user_id: userId,
        _role: role,
        _enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-advanced"] });
      toast.success("রোল আপডেট হয়েছে");
    },
    onError: (error: any) => toast.error(error.message || "রোল আপডেট ব্যর্থ"),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">👥 ইউজার ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-1">ভেরিফাই, এডমিন, মডারেটর ও সাধারণ ইউজার রোল নিয়ন্ত্রণ</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="নাম, ইমেইল বা bio সার্চ..." className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="মোট ইউজার" value={stats.total} />
        <StatCard icon={Shield} label="এডমিন" value={stats.admins} />
        <StatCard icon={Star} label="মডারেটর" value={stats.moderators} />
        <StatCard icon={ShieldCheck} label="ভেরিফাইড" value={stats.verified} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "admin", "moderator", "user", "verified"] as const).map((filter) => (
          <Button key={filter} size="sm" variant={roleFilter === filter ? "default" : "outline"} onClick={() => setRoleFilter(filter)}>
            {filter === "all" ? "সব" : filter === "verified" ? "ভেরিফাইড" : roleLabels[filter]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse rounded-xl border border-border bg-card p-6">
          <div className="h-5 bg-muted rounded w-48 mb-4" />
          <div className="space-y-3">
            <div className="h-14 bg-muted rounded" />
            <div className="h-14 bg-muted rounded" />
            <div className="h-14 bg-muted rounded" />
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center rounded-xl border border-border bg-card p-10 text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ইউজার</th>
                  <th className="text-left px-4 py-3 font-medium">স্ট্যাটাস</th>
                  <th className="text-left px-4 py-3 font-medium">রোল</th>
                  <th className="text-left px-4 py-3 font-medium">যোগদান</th>
                  <th className="text-right px-4 py-3 font-medium">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const roles = user.roles ?? [];
                  return (
                    <tr key={user.user_id} className="hover:bg-muted/35">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center font-heading font-bold text-primary shrink-0">
                            {user.avatar_url ? <img src={user.avatar_url} alt={user.display_name || user.email || "User"} className="h-full w-full object-cover" /> : (user.display_name || user.email || "U").slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-1.5">
                              <span className="truncate">{user.display_name || "নাম নেই"}</span>
                              {user.is_verified && <ShieldCheck className="h-4 w-4 text-secondary shrink-0" />}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{user.email || "ইমেইল নেই"}</div>
                            {user.bio && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{user.bio}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.is_verified ? "secondary" : "outline"} className="gap-1">
                          {user.is_verified ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          {user.is_verified ? "ভেরিফাইড" : "সাধারণ"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {roles.length > 0 ? roles.map((role) => <Badge key={role} variant={role === "admin" ? "default" : "outline"}>{roleLabels[role]}</Badge>) : <Badge variant="outline">রোল নেই</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString("bn-BD")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant={user.is_verified ? "secondary" : "outline"}
                            disabled={toggleVerified.isPending}
                            onClick={() => toggleVerified.mutate({ userId: user.user_id, isVerified: !user.is_verified })}
                            className="h-8 text-xs"
                          >
                            {user.is_verified ? "ভেরিফাইড ✓" : "ভেরিফাই"}
                          </Button>
                          {roleOrder.map((role) => {
                            const active = roles.includes(role);
                            return (
                              <Button
                                key={role}
                                size="sm"
                                variant={active ? "default" : "outline"}
                                disabled={toggleRole.isPending}
                                onClick={() => toggleRole.mutate({ userId: user.user_id, role, enabled: !active })}
                                className="h-8 text-xs"
                              >
                                {roleLabels[role]}
                              </Button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-heading font-bold">{value.toLocaleString("bn-BD")}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}