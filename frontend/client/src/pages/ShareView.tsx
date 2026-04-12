import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { TimetableGrid } from "@/components/TimetableGrid";
import { Button } from "@/components/ui/button";
import { apiFetch, API_BASE } from "@/lib/api";
import { Download } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ShareView() {
  const [match, params] = useRoute("/share/:token");
  const token = params?.token;
  const [data, setData] = useState<any>(null);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  useDocumentTitle(data?.name || "Shared Timetable");

  useEffect(() => {
    if (!token) return;
    apiFetch<{ timetable: any; permission: "view" | "edit" }>(`/share/link/${token}`)
      .then((res) => {
        setData(res.timetable);
        setPermission(res.permission);
      })
      .catch(() => setData(null));
  }, [token]);

  if (!data) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4">
        <div className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          Shared Timetable
          <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground">
            {permission === "edit" ? "Editable" : "View-only"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`${API_BASE}/export/${data._id}/ics?token=${token}`}>
              <Download className="w-4 h-4 mr-2" /> Export ICS
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`${API_BASE}/export/${data._id}/csv?token=${token}`}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </a>
          </Button>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-white rounded-xl border border-border/60 overflow-hidden">
          <TimetableGrid
            data={data.grid || data.timetable}
            days={data.constraints?.days || []}
            timeSlots={(data.constraints?.time_slots || []).map((s: any) =>
              typeof s === "string" ? s : `${s.start}-${s.end}`
            )}
          />
        </div>
      </div>
    </div>
  );
}
