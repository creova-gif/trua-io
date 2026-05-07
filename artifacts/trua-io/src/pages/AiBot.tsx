import { useState, useRef, useEffect } from "react";
import { useListAnthropicConversations, useCreateAnthropicConversation, useGetAnthropicConversation, getListAnthropicConversationsQueryKey, getGetAnthropicConversationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Bot, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AiBot() {
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: conversations } = useListAnthropicConversations();
  const createConv = useCreateAnthropicConversation();
  const { data: activeConv } = useGetAnthropicConversation(activeConvId!, {
    query: {
      enabled: !!activeConvId,
      queryKey: getGetAnthropicConversationQueryKey(activeConvId!),
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, streamingContent]);

  const handleNewConversation = () => {
    createConv.mutate({ data: { title: `Chat ${new Date().toLocaleTimeString()}` } }, {
      onSuccess: (conv) => {
        qc.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
        setActiveConvId(conv.id);
      },
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConvId || isStreaming) return;
    const message = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`${basePath}/api/anthropic/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                acc += data.content;
                setStreamingContent(acc);
              }
              if (data.done) {
                setStreamingContent("");
                await qc.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(activeConvId) });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const messages = activeConv?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <Button
          size="sm"
          onClick={handleNewConversation}
          data-testid="button-new-conversation"
          disabled={createConv.isPending}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" /> New Chat
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations?.map((c) => (
            <button
              key={c.id}
              data-testid={`conv-${c.id}`}
              onClick={() => setActiveConvId(c.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors",
                activeConvId === c.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <MessageSquare className="inline w-3.5 h-3.5 mr-2 opacity-60" />
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Trua AI Assistant</p>
            <p className="text-xs text-muted-foreground">Powered by Claude · Tanzanian B2B specialist</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConvId ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">Trua AI Assistant</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Ask me anything about your contacts, campaign strategy, email drafting, or the Tanzanian B2B market.
              </p>
              <Button className="mt-4" onClick={handleNewConversation} data-testid="button-start-chat">
                Start a conversation
              </Button>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  data-testid={`message-${m.id}`}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-muted text-foreground text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap">{streamingContent}</p>
                    <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              )}
              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-muted">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        {activeConvId && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                data-testid="input-chat-message"
                placeholder="Ask about contacts, campaigns, or email strategy..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={isStreaming}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
