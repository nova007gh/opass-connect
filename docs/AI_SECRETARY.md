# Mr. Atsu (Mamaaa)

Mamaaa is designed as four coordinated roles:
- Alumni guide and support agent
- AI secretary / intake assistant
- Advertising and sponsorship qualification assistant
- Quote-estimation assistant

Quote flow:
1. Identify request type.
2. Ask duration, placement, audience, creative type and urgency.
3. Generate an estimate from the deterministic quote engine.
4. Create ContractIntake and Quote records.
5. Mark the output as an estimate requiring authorized OPASS approval.
6. An authorized officer can accept, modify or reject the quote before any contract is binding.

This separation is intentional: the AI may prepare and route contracts, but should not autonomously bind the organization to legal obligations without explicitly configured human authorization.
