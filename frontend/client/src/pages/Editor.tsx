import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useTimetable } from "@/hooks/use-timetables";
import { TimetableGrid } from "@/components/TimetableGrid";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/AuthModal";
import { apiFetch, API_BASE } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDocumentTitle } from "@/hooks/use-document-title";

function toTimeSlots(timeSlots: any[] = []) {
  return timeSlots.map((slot: any) => (typeof slot === "string" ? slot : `${slot.start}-${slot.end}`));
}

export default function Editor() {
  const [, params] = useRoute("/editor/:id");
  const id = params?.id;
  const { data: timetable, isLoading } = useTimetable(id);
  const { toast } = useToast();
  const { user, setShowLogin } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);

  const days = useMemo(() => timetable?.constraints?.days || [], [timetable?.constraints?.days]);
  const timeSlots = useMemo(() => toTimeSlots(timetable?.constraints?.time_slots || []), [timetable?.constraints?.time_slots]);
  useDocumentTitle(timetable?.title || "Editor");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl border border-border text-center">
          <h2 className="font-display font-bold text-2xl mb-2">Sign in to open this timetable</h2>
          <p className="text-muted-foreground mb-4">Saved timetables belong to an authenticated account.</p>
          <Button onClick={() => setShowLogin(true)}>Login or sign up</Button>
        </div>
        <AuthModal />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!timetable || !id) {
    return <div className="h-screen flex items-center justify-center">Timetable not found</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      <AuthModal />
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Timetable</DialogTitle>
            <DialogDescription>
              Choose whether collaborators can edit or view only.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const share = await apiFetch<{ token: string }>(`/share/${id}`, {
                  method: "POST",
                  body: JSON.stringify({ permission: "view" })
                });
                navigator.clipboard.writeText(`${window.location.origin}/share/${share.token}`);
                toast({ title: "View link copied", description: "Anyone with the link can view." });
                setShareOpen(false);
              }}
            >
              View-only link
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const share = await apiFetch<{ token: string }>(`/share/${id}`, {
                  method: "POST",
                  body: JSON.stringify({ permission: "edit" })
                });
                navigator.clipboard.writeText(`${window.location.origin}/share/${share.token}`);
                toast({ title: "Editable link copied", description: "Anyone with the link can edit." });
                setShareOpen(false);
              }}
            >
              Editable link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 shrink-0 z-20">
        <div className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="text-muted-foreground">Timetables /</span>
          {timetable.title || "Saved Timetable"}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`${API_BASE}/export/${id}/ics`}>
              <Download className="w-4 h-4 mr-2" /> Export ICS
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`${API_BASE}/export/${id}/csv`}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </a>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full bg-white rounded-xl shadow-sm border border-border/60 overflow-hidden p-4 flex flex-col gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg">Weekly Schedule</h2>
            <p className="text-sm text-muted-foreground">Saved timetable view.</p>
          </div>
          <div className="flex-1 min-h-0">
            <TimetableGrid
              data={timetable.grid || timetable.timetable}
              days={days}
              timeSlots={timeSlots}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
