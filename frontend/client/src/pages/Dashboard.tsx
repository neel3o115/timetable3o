import { Link, useLocation } from "wouter";
import { useDeleteTimetable, useTimetables } from "@/hooks/use-timetables";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Dashboard() {
  useDocumentTitle("Dashboard");

  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, signOut, setShowLogin } = useAuth();
  const { data: timetables, isLoading } = useTimetables(!!user);
  const deleteMutation = useDeleteTimetable();
  const { toast } = useToast();

  const handleCreate = () => {
    setLocation("/editor/new");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this timetable? This cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Deleted", description: "Timetable removed." });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Unable to delete timetable." });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 font-display font-bold text-xl cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <Calendar size={18} />
              </div>
              Timetable3o
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                )}
                <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowLogin(true)}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      {!user && !authLoading ? (
        <main className="container mx-auto px-6 py-20">
          <div className="bg-white rounded-3xl border border-border p-10 text-center">
            <h1 className="font-display font-bold text-3xl mb-2">Sign in to access your dashboard</h1>
            <p className="text-muted-foreground mb-6">Your saved timetables and sharing tools live here.</p>
            <div className="flex justify-center">
              <Button onClick={() => setShowLogin(true)}>Login or sign up</Button>
            </div>
          </div>
        </main>
      ) : (
      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground">My Timetables</h1>
            <p className="text-muted-foreground mt-1">Manage and organize your schedules</p>
          </div>
          <Button onClick={handleCreate} size="lg" className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 mr-2" /> New Timetable
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : timetables?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-border text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2">No timetables yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">Create your first timetable manually or ask our AI assistant to help you generate one.</p>
            <Button onClick={handleCreate}>Create Timetable</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timetables?.map((timetable, i) => (
              <motion.div
                key={timetable.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="group bg-white rounded-2xl border border-border p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col"
                  onClick={() => timetable.href && setLocation(timetable.href)}
                >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Calendar size={20} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                          timetable.status === "published"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {timetable.status === "published" ? "Published" : "Draft"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={deleteMutation.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(timetable.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <h3 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition-colors">{timetable.name}</h3>
                    
                    <div className="mt-auto space-y-3 pt-4 border-t border-border/50">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock size={12} className="mr-2" />
                        Last updated {timetable.updatedAt ? format(new Date(timetable.updatedAt), 'MMM d, yyyy') : 'Just now'}
                      </div>
                      <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                        Open Editor <ArrowRight size={14} className="ml-1" />
                      </div>
                    </div>
                  </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      )}
      <AuthModal />
    </div>
  );
}
