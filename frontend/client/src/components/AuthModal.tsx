import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

export function AuthModal() {
  const { showLogin, setShowLogin, login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(selectedMode: "login" | "signup") {
    setError("");
    setIsSubmitting(true);

    try {
      if (selectedMode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }

      setShowLogin(false);
      setPassword("");
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        try {
          const payload = JSON.parse(submitError.responseText);
          setError(payload.message || submitError.message);
        } catch {
          setError(submitError.message);
        }
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Authentication failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={showLogin} onOpenChange={setShowLogin}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Access your account</DialogTitle>
          <DialogDescription>
            Use email and password to save, share, and export your timetable.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={setMode} className="py-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          {["login", "signup"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={`${tab}-email`}>Email</Label>
                <Input
                  id={`${tab}-email`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete={tab === "login" ? "email" : "username"}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${tab}-password`}>Password</Label>
                <Input
                  id={`${tab}-password`}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder="At least 8 characters"
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button
                className="w-full"
                onClick={() => void handleSubmit(tab as "login" | "signup")}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : tab === "login" ? "Login" : "Create account"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
