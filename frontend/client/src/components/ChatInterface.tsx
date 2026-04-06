import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface ChatInterfaceProps {
  conversationId: number | null;
  className?: string;
  chat?: ReturnType<typeof useChat>;
}

export function ChatInterface({ conversationId, className, chat }: ChatInterfaceProps) {
  const chatApi = chat ?? useChat(conversationId);
  const { messages, sendMessage, isStreaming, lastConstraints, appendMessage } = chatApi;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const { user } = useAuth();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      greetedRef.current = false;
    }
  }, [messages.length]);

  useEffect(() => {
    if (greetedRef.current) return;
    if (messages.length > 0) return;

    const firstName = user?.name?.split(" ")[0]?.trim();
    const greeting = user
      ? `Hi ${firstName || "there"}! 👋  \nI’m Cleo, your AI timetable assistant.  \n\nI can help you design a complete schedule — classes, teachers, sections, rooms, and constraints — all in plain English.  \n\nJust describe what you need, and I’ll guide you step-by-step.  \nIf anything’s missing, I’ll ask a few quick questions.  \n\n✨ What kind of timetable would you like to create today?`
      : "Hi! 👋  \nI’m Cleo, your AI timetable assistant.  \n\nI can help you build a complete class schedule — days, time slots, subjects, teachers, sections, and more.  \n\nJust describe your requirements, and I’ll guide you step-by-step.  \n\n✨ What kind of timetable would you like to create today?";

    appendMessage({ role: "assistant", content: greeting });
    greetedRef.current = true;
  }, [appendMessage, messages.length, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId) return;
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border-r border-border", className)}>
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Assistant
        </h3>
        <p className="text-xs text-muted-foreground">Describe your schedule requirements</p>
        {lastConstraints && (
          <div className="mt-2 p-2 bg-primary/10 rounded-md text-[10px] font-mono text-primary flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Constraints extracted
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              
              <div className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm shadow-sm",
                msg.role === "user" 
                  ? "bg-primary text-white rounded-tr-sm" 
                  : "bg-white dark:bg-zinc-800 border border-border rounded-tl-sm"
              )}>
                <div
                  className={cn(
                    "prose prose-sm max-w-none break-words",
                    msg.role === "user" ? "prose-invert" : "dark:prose-invert"
                  )}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot size={14} />
              </div>
              <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isStreaming || !conversationId}
            className="pr-12 rounded-xl border-border/60 focus-visible:ring-primary/20 bg-muted/30"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!conversationId || !input.trim() || isStreaming}
            className="absolute right-1 top-1 h-8 w-8 rounded-lg shadow-none"
          >
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
}
