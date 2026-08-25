# Production deployment

## Minimum production topology
- Managed PostgreSQL with PITR/backups
- Redis for rate limits, queues and presence when real-time chat is enabled
- API behind a load balancer/WAF
- Next.js web behind CDN
- Object storage/CDN for media
- LiveKit Cloud or self-managed LiveKit for interactive audio/video
- Separate webinar/broadcast service + CDN for mega events
- Paystack and/or Flutterwave merchant accounts
- Central logs, metrics, error tracking and alerts

## 1M+ live attendance
Do not configure one million users as full two-way publishers. Use:
1. Stage/host room with a limited set of interactive publishers.
2. Program output transcoded to HLS/DASH/LL-HLS.
3. Multi-region CDN fan-out for viewers.
4. Separate horizontally scalable chat/reaction service.
5. Admission queues, rate limits, regional routing and load tests.
6. Failover stream and disaster recovery runbook.

The included Meeting.mode supports INTERACTIVE, WEBINAR and BROADCAST so the application can route users appropriately.

## Security launch gates
- Replace all secrets and rotate regularly.
- Enforce MFA for administrators.
- Verify alumni identity before enabling voting/admin privileges.
- Add CSRF protection if switching auth to cookies.
- Validate payment webhooks using provider-required cryptographic signatures over raw request bodies.
- Run SAST/dependency scans, external penetration testing and privacy review.
- Enable database backups and restore drills.
- Create moderation/abuse policy and incident-response contacts.

## App stores
Use EAS Build for Android/iOS signing, configure production API URL, add privacy manifests/policies, permissions strings and store metadata before submission.
