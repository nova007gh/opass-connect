# API overview

Public: GET /health, GET /year-groups, GET /projects, GET /events, GET /businesses
Auth: POST /auth/register, POST /auth/login, GET /auth/me
Alumni: GET /alumni, POST /year-groups/:id/join
Meetings: POST /meetings, POST /meetings/:id/token
Payments: POST /payments/initialize, POST /payments/verify/:reference
Voting: POST /elections/:id/vote
AI: POST /ai/chat, POST /ai/quote
Admin: GET /admin/stats
