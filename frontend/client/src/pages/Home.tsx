import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Sparkles, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Home() {
  useDocumentTitle();

  return (
    <div className="min-h-screen bg-background font-sans overflow-hidden relative">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl animate-float opacity-70" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-float [animation-delay:-3s] opacity-70" />
      </div>

      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-tight text-foreground">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white">
            <Calendar size={18} strokeWidth={3} />
          </div>
          Timetable3o
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" className="font-semibold">Log In</Button>
        </Link>
      </header>

      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-semibold mb-8 border border-primary/10"
        >
          <Sparkles size={14} />
          <span>Constraint-based Timetable Builder</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="font-display font-bold text-5xl md:text-7xl leading-[1.1] tracking-tight mb-6 max-w-4xl"
        >
          Scheduling made <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">effortless</span> and flexible.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
        >
          Create timetables by defining your own constraints. Auto-generate schedules using a CP-SAT based solver,
          fine-tune them manually, and share with anyone in seconds.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center"
        >
          <Link href="/editor/new">
            <Button size="lg" variant="premium" className="h-14 px-8 text-lg rounded-2xl w-full sm:w-auto">
              Create New Timetable <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-2xl border-2 hover:bg-muted/50 w-full sm:w-auto">
              View Dashboard
            </Button>
          </Link>
        </motion.div>

        {/* Feature Cards Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          {[
            {
              icon: <LayoutGrid className="w-6 h-6 text-indigo-500" />,
              title: "Interactive Grid",
              desc: "Drag, drop, and organize classes across sections with full control."
            },
            {
              icon: <Sparkles className="w-6 h-6 text-purple-500" />,
              title: "Auto Scheduling",
              desc: "Generate valid timetables using Google OR-Tools CP-SAT solver based on your constraints."
            },
            {
              icon: <Calendar className="w-6 h-6 text-pink-500" />,
              title: "Easy Sharing",
              desc: "Share your timetable instantly with a public link and let others view it with section filters."
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
