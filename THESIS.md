# Two-Year Thesis: Where Decision Layers Go Next

*(≤300 words — also rendered at `/thesis` in the app)*

Decision layers become the trust primitive of agentic systems — not a feature bolted onto an agent, but the layer everything else calls through, the way auth became the thing every API call passes through rather than a check each endpoint reimplements.

Three shifts over the next two years:

**1. Decision layers get extracted from agents into shared infrastructure.** Every "agentic" product currently reinvents its own ad hoc guardrails. Teams will start importing a decision layer the way they import an auth provider — same shape (propose action + context, get outcome + audit), swappable policy underneath, reused across a dozen agents instead of rewritten inside each one.

**2. Confidence becomes an audited number, not a hidden model internal.** "The model was confident" is an unfalsifiable claim buried in a chat transcript today. That stops being acceptable the first time it's the answer given to a regulator, an insurer, or a customer after an incident. Structured evidence trails — what evidence, what was missing, the reversibility calculus — become the expected output, not a nice-to-have.

**3. Reversibility becomes an explicit design constraint**, the way idempotency and rate limits are now. Actions get built with documented rollback paths specifically so a decision layer can score them reversible and unlock autonomy; irreversible-by-default actions get walled off from agents entirely — not because models got smarter, but because orgs stop trusting confidence alone with things that can't be undone.

The failure mode to bet against: decision layers built as "ask an LLM if this is safe," recursively. That moves the trust problem up one level without solving it — still a black box, just politer. The systems that last look like this one: deterministic, inspectable scoring with LLMs used narrowly as signal extractors, never as the judge.
