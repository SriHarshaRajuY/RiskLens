"use client";

import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
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

const SUGGESTED_QUESTIONS = [
  "Why did my drawdown change recently?",
  "Explain my risk score and volatility",
  "Which holding drives my concentration risk?",
  "Break down my realized vs unrealized P&L",
  "Which risk alerts are currently breached?"
];

function sourceBadge(item: PortfolioQaResponse) {
  if (item.source === "guardrail") {
    return <Badge variant="warning">Non-advisory boundary</Badge>;
  }
  if (item.source === "gemini") {
    return (
      <Badge variant="secondary" className="border-primary/30 bg-primary/10 text-primary">
        AI Assistant
      </Badge>
    );
  }
  return <Badge variant="secondary">Built-in Q&amp;A Engine</Badge>;
}

function fallbackHint(item: PortfolioQaResponse): string | null {
  if (item.source !== "deterministic-fallback") return null;
  if (!item.fallbackReason || item.fallbackReason === "missing_api_key") return null;
  return "AI assistant was unavailable for this request — answered accurately using your built-in portfolio engine.";
}

export function PortfolioQaPanel({ portfolioId }: { portfolioId: string }) {
  const [question, setQuestion] = useState("");
  const { history, askQuestion, clearHistory, isAsking } = usePortfolioQa(portfolioId);

  async function submitQuestion(rawText: string): Promise<void> {
    const trimmed = rawText.trim();
    if (trimmed.length < 3 || isAsking) return;
    try {
      await askQuestion(trimmed);
      setQuestion("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not answer that question right now."));
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
            Ask free-form questions about your recorded trades, drawdown movements, concentration, P&amp;L, or alert status.
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
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              size="xs"
              disabled={isAsking}
              onClick={() => void submitQuestion(prompt)}
              className="rounded-full bg-background text-muted-foreground hover:text-foreground"
            >
              <MessageSquareText className="h-3 w-3 text-primary" />
              {prompt}
            </Button>
          ))}
        </div>

        {history.length > 0 ? (
          <div className="max-h-[440px] space-y-4 overflow-y-auto pr-1">
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
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/15 p-4 text-xs leading-relaxed text-muted-foreground">
            Try clicking one of the suggested questions above or ask your own—for example,{" "}
            <span className="font-medium text-foreground">&ldquo;Why did my drawdown jump last week?&rdquo;</span> or{" "}
            <span className="font-medium text-foreground">&ldquo;How much P&amp;L came from my top holding?&rdquo;</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a factual question about your portfolio history..."
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
          <Button type="submit" disabled={isAsking || question.trim().length < 3} className="w-full sm:w-auto">
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
