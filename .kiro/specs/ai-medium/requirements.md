# Requirements: AI medium (features 5 and 7)

1. The user SHALL bring their own key for Anthropic, OpenAI or Mistral.
2. The key SHALL live in memory for the current tab only: never localStorage, sessionStorage, cookies, logs or a server database.
3. WHEN the first AI call in a tab is about to happen THEN the system SHALL show exactly what will be sent and wait for "Send it".
4. The AI SHALL explain a finding, draft a fix as a diff and answer follow-up questions. Diffs SHALL never be applied without a click.
5. Payloads SHALL contain masked secret values only, and only for the demo or a proven owner.
6. The attack path SHALL link only findings that connect and cite finding ids; steps with unknown ids SHALL be dropped.
7. The relay for OpenAI and Mistral SHALL forward and store nothing; a test SHALL prove request bodies are not logged.
8. The demo SHALL work without a key using prepared answers.
