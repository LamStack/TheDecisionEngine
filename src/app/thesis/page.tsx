export default function ThesisPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Two-Year Thesis</h1>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted">Where decision layers go next &middot; &le;300 words</p>
      </section>

      <article className="max-w-3xl space-y-4 rounded-xl border border-border bg-panel p-6 text-sm leading-relaxed text-muted">
        <p>
          Decision layers become the trust primitive of agentic systems: not a feature bolted onto an agent,
          but the layer everything else calls through, the way auth became the thing every API call passes through
          rather than a check each endpoint reimplements.
        </p>
        <p className="text-ink">Three shifts over the next two years:</p>
        <p>
          <strong className="text-ink">1. Decision layers get extracted from agents into shared infrastructure.</strong>{" "}
          Every &ldquo;agentic&rdquo; product currently reinvents its own ad hoc guardrails. Teams will start
          importing a decision layer the way they import an auth provider: same shape (propose action +
          context, get outcome + audit), swappable policy underneath, reused across a dozen agents instead of
          rewritten inside each one.
        </p>
        <p>
          <strong className="text-ink">2. Confidence becomes an audited number, not a hidden model internal.</strong>{" "}
          &ldquo;The model was confident&rdquo; is an unfalsifiable claim buried in a chat transcript today. That
          stops being acceptable the first time it&rsquo;s the answer given to a regulator, an insurer, or a
          customer after an incident. Structured evidence trails (what evidence, what was missing, the
          reversibility calculus) become the expected output, not a nice-to-have.
        </p>
        <p>
          <strong className="text-ink">3. Reversibility becomes an explicit design constraint</strong>, the way
          idempotency and rate limits are now. Actions get built with documented rollback paths specifically so a
          decision layer can score them reversible and unlock autonomy. Irreversible-by-default actions get walled
          off from agents entirely, not because models got smarter, but because orgs stop trusting confidence
          alone with things that can&rsquo;t be undone.
        </p>
        <p>
          The failure mode to bet against: decision layers built as &ldquo;ask an LLM if this is safe,&rdquo;
          recursively. That moves the trust problem up one level without solving it: still a black box, just
          politer. The systems that last look like this one: deterministic, inspectable scoring with LLMs used
          narrowly as signal extractors, never as the judge.
        </p>
      </article>
    </div>
  );
}
