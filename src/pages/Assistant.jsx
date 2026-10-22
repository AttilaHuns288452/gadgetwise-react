import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.js";
import { GW } from "../lib.js";

const EXAMPLES = [
  "I need a laptop for computer science under ₱40,000.",
  "Compare the best-value options for taking notes and attending classes.",
  "What trade-offs should I consider between battery life and performance?",
];

export default function Assistant() {
  const { user, ready } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canAsk = useMemo(
    () => supabaseConfigured && Boolean(user) && !busy && prompt.trim().length >= 2,
    [user, busy, prompt],
  );

  async function submit(event) {
    event.preventDefault();
    const question = prompt.trim();
    if (!question || busy) return;
    if (question.length > 4000) {
      setError("Keep your question under 4,000 characters.");
      return;
    }
    if (!supabaseConfigured) {
      setError("The backend is not configured. Set the Supabase frontend environment variables and deploy the GadgetWise assistant function.");
      return;
    }
    if (!user) {
      setError("Sign in before using the AI assistant.");
      return;
    }

    setError("");
    setPrompt("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("gadget-assistant", {
        body: { prompt: question },
      });
      if (invokeError) throw invokeError;
      if (!data || typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The assistant returned an invalid response.");
      }
      setMessages((current) => [...current, {
        role: "assistant",
        content: data.answer,
        productIds: Array.isArray(data.productIds) ? data.productIds : [],
      }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.includes("FunctionsRelayError") || message.includes("Failed to fetch")
        ? "The AI endpoint could not be reached. Check that the Supabase function is deployed and its secrets are configured."
        : (message || "The assistant is temporarily unavailable. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-20 pt-10 lg:px-10">
      <div className="eyebrow">GadgetWise intelligence</div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">AI Gadget Assistant</h1>
      <p className="mt-3 max-w-2xl text-ink2">
        Describe what you need. The assistant uses published GadgetWise catalog records and should tell you when a detail cannot be verified.
      </p>

      {!supabaseConfigured && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Backend not configured. This assistant will not use a fake response or call the AI provider directly from your browser.
        </div>
      )}
      {ready && supabaseConfigured && !user && (
        <div className="mt-6 rounded-xl border border-line bg-surface2 p-4 text-sm">
          <p>Sign in to use the AI assistant.</p>
          <Link to="/login" className="mt-2 inline-block font-semibold text-primary hover:underline">Log in →</Link>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
        {messages.length === 0 ? (
          <div>
            <h2 className="text-lg font-bold">What gadget are you looking for?</h2>
            <p className="mt-1 text-sm text-ink2">Ask about budgets, study workloads, ownership cost, or product trade-offs.</p>
            <div className="mt-5 grid gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  disabled={!user || busy}
                  className="rounded-xl border border-line px-4 py-3 text-left text-sm transition hover:border-primary hover:bg-primary-wash disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5" aria-live="polite">
            {messages.map((message, index) => (
              <article key={index} className={message.role === "user" ? "ml-4 rounded-xl bg-primary-wash p-4 sm:ml-16" : "mr-4 rounded-xl bg-surface2 p-4 sm:mr-10"}>
                <div className="text-xs font-bold uppercase tracking-wider text-ink2">
                  {message.role === "user" ? "You" : "GadgetWise assistant"}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                {message.role === "assistant" && message.productIds?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.productIds.map((id) => (
                      <Link key={id} to={"/g/" + encodeURIComponent(id)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-primary hover:border-primary">
                        View {GW.getGadget(id) ? GW.displayName(GW.getGadget(id)) : id} →
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {busy && <p className="text-sm text-ink2" role="status">Checking the catalog and preparing an answer…</p>}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 border-t border-line pt-5">
          <label htmlFor="assistant-question" className="block text-sm font-semibold">Your question</label>
          <textarea
            id="assistant-question"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={4000}
            rows={3}
            placeholder="Example: Find a programming laptop that offers good value for a student."
            className="field mt-2 w-full resize-y"
            disabled={!user || busy || !supabaseConfigured}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink3">Product data may be incomplete or unverified. Confirm important specifications with the seller.</p>
            <button type="submit" disabled={!canAsk} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Thinking…" : "Ask assistant"}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </form>
      </div>
      <p className="mt-4 text-xs text-ink3">
        Conversations are held in this page's memory only and are not restored after refresh. The assistant is advisory and does not verify retailer inventory.
      </p>
    </section>
  );
}
