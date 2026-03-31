import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import EditorSetup from "@/pages/EditorSetup";
import ShareView from "@/pages/ShareView";
import SharedView from "@/pages/SharedView";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/editor" component={Dashboard} /> {/* Redirect to list if no ID */}
      <Route path="/editor/new" component={EditorSetup} />
      <Route path="/editor/draft/:id" component={EditorSetup} />
      <Route path="/editor/:id" component={Editor} />
      <Route path="/share/:token" component={ShareView} />
      <Route path="/t/:id" component={SharedView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
