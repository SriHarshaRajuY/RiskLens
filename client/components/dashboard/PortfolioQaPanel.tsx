"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePortfolioQa } from "@/hooks/usePortfolioQa";
import { getApiErrorMessage } from "@/lib/api";
import type { PortfolioQaResponse } from "@/types/analytics";

const SUGGESTED_QUESTIONS: Array<{ category: string; prompt: string }> = [
  { category: "Concept", prompt: "What is a risk score?" },
  { category: "Drawdown", prompt: "Why did my drawdown change recently?" },
  { category: "Exposure", prompt: "Which holding drives my concentration risk?" },
  { category: "Performance", prompt: "Break down my realized vs unrealized P&L" },
  { category: "Alerts", prompt: "Which risk alerts are currently breached?" }
];

function sourceBadge(item: PortfolioQaResponse) {
  if (item.source === "guardrail") {
    return <Badge variant="warning">Non-advisory boundary</Badge>;
  }
  if (item.source === "gemini") {
    return (
      <Badge variant="success" className="gap-1">
        <Sparkles className="h-3 w-3" />
        Gemini AI{item.model ? ` · ${item.model}` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Cpu className="h-3 w-3" />
      Built-in Assistant
    </Badge>
  );
}

function fallbackHint(item: PortfolioQaResponse): string | null {
  if (item.source !== "deterministic-fallback" || !item.fallbackReason) return null;
  switch (item.fallbackReason) {
    case "missing_api_key":
      return null;
    case "quota_exceeded":
      return "Gemini is temporarily busy (rate limit) — answered using your built-in portfolio assistant.";
    case "timeout":
      return "Gemini took too long to respond — answered using your built-in portfolio assistant.";
    case "invalid_output":
    case "provider_error":
    default:
      return "Gemini was temporarily unavailable — answered using your built-in portfolio assistant.";
  }
}

export function PortfolioQaPanel({ portfolioId }: { portfolioId: string }) {
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const { history, askQuestion, clearHistory, isAsking } = usePortfolioQa(portfolioId);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [history.length, pendingQuestion]);

  async function submitQuestion(rawText: string): Promise<void> {
    const trimmed = rawText.trim();
    if (trimmed.length < 2 || isAsking) return;
    setPendingQuestion(trimmed);
    setQuestion("");
    try {
      await askQuestion(trimmed);
    } catch (error) {
      setQuestion(trimmed);
      toast.error(getApiErrorMessage(error, "Could not answer that question right now."));
    } finally {
      setPendingQuestion(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submitQuestion(question);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b bg-muted/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask About Your Portfolio
            </CardTitle>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Factual Q&amp;A
            </Badge>
          </div>
          <CardDescription>
            Ask general risk questions or anything about your recorded trades, drawdown history, holdings, P&amp;L, or alerts.
          </CardDescription>
        </div>
        {history.length > 0 ? (
          <Button variant="outline" size="sm" onClick={clearHistory} disabled={isAsking}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {history.length > 0 || pendingQuestion ? (
          <>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((item) => (
                <Button
                  key={item.prompt}
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isAsking}
                  onClick={() => void submitQuestion(item.prompt)}
                  className="rounded-full bg-background text-muted-foreground hover:text-foreground"
                >
                  <MessageSquareText className="h-3 w-3 text-primary" />
                  {item.prompt}
                </Button>
              ))}
            </div>

            <div ref={threadRef} className="max-h-[440px] space-y-4 overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div key={`${item.answeredAt}-${idx}`} className="space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                      {item.question}
                    </div>
                  </div>

                  <div
                    className={
                      item.refused
                        ? "rounded-xl border border-amber-200 bg-amber-50/60 p-4"
                        : "rounded-xl border bg-muted/25 p-4"
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.refused ? (
                          <AlertCircle className="h-4 w-4 text-amber-700" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                        {sourceBadge(item)}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(item.answeredAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="mt-2.5 text-sm leading-relaxed text-foreground">{item.answer}</p>

                    {fallbackHint(item) ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">{fallbackHint(item)}</p>
                    ) : null}

                    {item.supportingFacts.length > 0 ? (
                      <ul className="mt-3 space-y-1.5 border-t pt-2.5 text-xs text-muted-foreground">
                        {item.supportingFacts.map((fact, factIdx) => (
                          <li key={factIdx} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {item.metricsReferenced.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.metricsReferenced.map((metric) => (
                          <span
                            key={metric}
                            className="rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {metric}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {pendingQuestion ? (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                      {pendingQuestion}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border bg-muted/25 p-4 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Reviewing your portfolio records...</span>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/15 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Suggested questions
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Click any topic below to start a conversation, or ask your own question at the bottom.
            </p>
            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((item) => (
                <button
                  key={item.prompt}
                  type="button"
                  disabled={isAsking}
                  onClick={() => void submitQuestion(item.prompt)}
                  className="group flex items-start gap-2.5 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:scale-105" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.category}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-foreground">{item.prompt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about a metric or your portfolio history..."
              maxLength={500}
              disabled={isAsking}
              aria-label="Portfolio question"
            />
            {question.length > 350 ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
                {question.length}/500
              </span>
            ) : null}
          </div>
          <Button type="submit" disabled={isAsking || question.trim().length < 2} className="w-full sm:w-auto">
            {isAsking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Answering...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Ask
              </>
            )}
          </Button>
        </form>

        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Informational recordkeeping only. Questions asking for trade recommendations or price predictions are automatically declined.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
