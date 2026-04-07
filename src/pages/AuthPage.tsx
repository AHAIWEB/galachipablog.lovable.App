import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("লগইন সফল!");
        navigate("/admin");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("রেজিস্ট্রেশন সফল! ইমেইল চেক করুন।");
      }
    } catch (err: any) {
      toast.error(err.message || "কিছু একটা ভুল হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-8 shadow-lg">
        <h1 className="font-heading font-bold text-2xl text-center mb-6">
          {isLogin ? "লগইন" : "রেজিস্ট্রেশন"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">নাম</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="আপনার নাম"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-foreground">ইমেইল</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">পাসওয়ার্ড</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-heading font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "অপেক্ষা করুন..." : isLogin ? "লগইন করুন" : "রেজিস্টার করুন"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {isLogin ? "অ্যাকাউন্ট নেই?" : "অ্যাকাউন্ট আছে?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "রেজিস্টার করুন" : "লগইন করুন"}
          </button>
        </p>
      </div>
    </div>
  );
}
