import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, ChevronLeft, ChevronRight, Trash2, RefreshCw, Archive } from "lucide-react";

const bengaliMonths = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const categoryLabels: Record<string, string> = { historical: "ঘটনা", birth: "জন্ম", death: "মৃত্যু", general: "সাধারণ" };

export default function AdminThisDay() {
  const qc = useQueryClient();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isScrapingThisDay, setIsScrapingThisDay] = useState(false);
  const [thisDayStartMonth, setThisDayStartMonth] = useState(1);
  const [thisDayEndMonth, setThisDayEndMonth] = useState(12);

  // Stats per month
  const { data: monthStats } = useQuery({
    queryKey: ["this-day-month-stats"],
    queryFn: async () => {
      const stats: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        const { count } = await supabase
          .from("this_day_events")
          .select("*", { count: "exact", head: true })
          .eq("month", m);
        stats[m] = count ?? 0;
      }
      return stats;
    },
  });

  // Events for selected day
  const { data: dayEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["this-day-day-events", selectedMonth, selectedDay],
    queryFn: async () => {
      if (!selectedDay) return [];
      const { data } = await supabase
        .from("this_day_events")
        .select("*")
        .eq("month", selectedMonth)
        .eq("day", selectedDay)
        .order("year", { ascending: true })
        .limit(200);
      return data ?? [];
    },
    enabled: !!selectedDay,
  });

  // Days with events count for calendar
  const { data: dayCounts } = useQuery({
    queryKey: ["this-day-day-counts", selectedMonth],
    queryFn: async () => {
      const counts: Record<number, number> = {};
      const { data } = await supabase
        .from("this_day_events")
        .select("day")
        .eq("month", selectedMonth);
      if (data) {
        for (const row of data) {
          counts[row.day] = (counts[row.day] || 0) + 1;
        }
      }
      return counts;
    },
  });

  const handleScrapeThisDay = async () => {
    setIsScrapingThisDay(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-this-day", {
        body: { start_month: thisDayStartMonth, end_month: thisDayEndMonth },
      });
      if (error) throw error;
      toast.success(`${data?.total_events ?? 0}টি ঘটনা সেভ হয়েছে`);
      qc.invalidateQueries({ queryKey: ["this-day"] });
    } catch (e: any) {
      toast.error(e.message || "স্ক্র্যাপিং ব্যর্থ");
    } finally {
      setIsScrapingThisDay(false);
    }
  };

  const deleteDay = useMutation({
    mutationFn: async ({ month, day }: { month: number; day: number }) => {
      const { error } = await supabase.from("this_day_events").delete().eq("month", month).eq("day", day);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["this-day"] });
      toast.success("ডিলিট হয়েছে");
    },
  });

  const maxDay = daysInMonth[selectedMonth - 1];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-4">📅 ইতিহাসের এই দিনে</h1>

      {/* Scraper controls */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Wikipedia স্ক্র্যাপার
        </h3>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-xs">শুরু:</label>
          <select value={thisDayStartMonth} onChange={e => setThisDayStartMonth(Number(e.target.value))}
            className="px-2 py-1 rounded border border-input bg-background text-sm">
            {bengaliMonths.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <label className="text-xs">শেষ:</label>
          <select value={thisDayEndMonth} onChange={e => setThisDayEndMonth(Number(e.target.value))}
            className="px-2 py-1 rounded border border-input bg-background text-sm">
            {bengaliMonths.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={handleScrapeThisDay} disabled={isScrapingThisDay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {isScrapingThisDay ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {isScrapingThisDay ? "স্ক্র্যাপিং..." : "স্ক্র্যাপ করুন"}
          </button>
        </div>
      </div>

      {/* Month stats overview */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
        {bengaliMonths.map((m, i) => (
          <button key={i} onClick={() => { setSelectedMonth(i + 1); setSelectedDay(null); }}
            className={`p-2 rounded-lg border text-center transition-colors ${selectedMonth === i + 1 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
            <p className="text-xs font-medium">{m}</p>
            <p className="text-lg font-bold">{monthStats?.[i + 1] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Calendar grid for selected month */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { setSelectedMonth(p => p > 1 ? p - 1 : 12); setSelectedDay(null); }}
            className="p-1 hover:bg-muted rounded"><ChevronLeft className="h-4 w-4" /></button>
          <h3 className="font-heading font-semibold">{bengaliMonths[selectedMonth - 1]}</h3>
          <button onClick={() => { setSelectedMonth(p => p < 12 ? p + 1 : 1); setSelectedDay(null); }}
            className="p-1 hover:bg-muted rounded"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map(day => {
            const count = dayCounts?.[day] || 0;
            const isSelected = selectedDay === day;
            const isToday = day === today.getDate() && selectedMonth === today.getMonth() + 1;
            return (
              <button key={day} onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative
                  ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-accent ring-2 ring-primary" : count > 0 ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50"}`}>
                <span className="font-medium">{day}</span>
                {count > 0 && <span className={`text-[8px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events for selected day */}
      {selectedDay && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center justify-between">
            <span className="font-heading font-semibold text-sm">
              {selectedDay} {bengaliMonths[selectedMonth - 1]} — {dayEvents.length}টি ঘটনা
            </span>
            <button onClick={() => { if (confirm("এই দিনের সব ঘটনা ডিলিট?")) deleteDay.mutate({ month: selectedMonth, day: selectedDay }); }}
              className="text-xs text-destructive hover:underline flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> সব ডিলিট
            </button>
          </div>
          {loadingEvents ? (
            <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে...</p>
          ) : dayEvents.length > 0 ? (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {dayEvents.map((ev: any) => (
                <div key={ev.id} className="px-4 py-2.5">
                  <p className="text-sm">
                    {ev.year && <span className="font-bold text-primary mr-1.5">{ev.year}:</span>}
                    {ev.title}
                  </p>
                  {ev.category && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block
                      ${ev.category === "birth" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : ev.category === "death" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                      {categoryLabels[ev.category] || ev.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">এই দিনে কোনো ঘটনা নেই</p>
          )}
        </div>
      )}
    </div>
  );
}
