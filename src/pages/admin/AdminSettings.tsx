import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value ?? ""; });
      return map;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const values = { ...settings, ...form };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value })
          .eq("key", key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("সেটিংস সেভ হয়েছে");
      setForm({});
    },
    onError: (err: any) => toast.error(err.message),
  });

  const fields = [
    { key: "site_name", label: "সাইটের নাম" },
    { key: "divider_text", label: "সেকশন ডিভাইডার টেক্সট" },
    { key: "primary_color", label: "প্রাইমারি কালার (HEX)" },
    { key: "logo_url", label: "লোগো URL" },
  ];

  if (isLoading) return <p className="text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">🎨 ডিজাইন সেটিংস</h1>

      <div className="bg-card rounded-xl border border-border p-5 max-w-lg">
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              <input
                value={values[f.key] ?? ""}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={Object.keys(form).length === 0 || saveMutation.isPending}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </button>
      </div>
    </div>
  );
}
