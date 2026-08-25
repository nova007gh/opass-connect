# OPASS CONNECT

Production-oriented monorepo for the Ofori Panin Senior High School alumni platform, developed by SmartThinkers™ Tech.

## Included
- Mobile app: Expo / React Native (iOS + Android)
- Web app: Next.js
- API: Fastify + TypeScript
- Database: PostgreSQL + Prisma
- Authentication and role-based access control
- Alumni profiles, year groups, directory, chat-ready room model
- Assembly Hall / video meetings using LiveKit token service
- Mega-event architecture notes for 1M+ audience via broadcast/CDN fan-out
- Events, fundraising projects, dues and payments
- Business directory, advertising requests and admin approval
- Elections and one-member-one-vote enforcement
- AI assistant: Mr. Atsu (Mamaaa), including customer service, secretary intake and quote generation
- Admin analytics endpoints
- Docker Compose, Dockerfiles, Nginx example and GitHub Actions CI

## Important production note
This repository is deployment-ready architecture, not a claim that a system can safely handle one million simultaneous interactive video publishers on a single room. Large events should use a broadcast/webinar topology: limited interactive speakers, scalable media fan-out/CDN, chat/reaction services, regional capacity planning and provider load testing.

Before public launch, add real provider credentials, legal/privacy policies, school authorization for branding, payment-provider verification, penetration testing, load testing, backups and incident-response procedures.

## Local development
1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d postgres redis`.
3. Run `pnpm install`.
4. Run `pnpm db:generate && pnpm db:migrate`.
5. Run `pnpm dev`.

Web: http://localhost:3000
API health: http://localhost:4000/health
