import { prisma } from '@opass/db';

/**
 * The respectful OPASS title to address a user by, based on gender.
 * Defaults to "Opanin" when gender is not set.
 */
export function honorific(gender?: string | null): string {
  return gender === 'FEMALE' ? 'Obaa Panin' : 'Opanin';
}

/**
 * Returns the full respectful form of address for a user, e.g. "Opanin Kwame"
 * or "Obaa Panin Efua", using their first name.
 */
export async function getUserHonorific(userId?: string): Promise<string> {
  if (!userId) return 'Opanin';
  const profile = await prisma.alumniProfile.findUnique({ where: { userId }, select: { fullName: true, gender: true } });
  if (!profile) return 'Opanin';
  const firstName = profile.fullName?.split(' ')[0] || '';
  return `${honorific(profile.gender)}${firstName ? ' ' + firstName : ''}`;
}

/**
 * Gather comprehensive site context for the AI.
 * This gives Mamaa AI the ability to "scrape" all data, actions, and inputs
 * happening across the app and respond intelligently.
 */
export async function getSiteContext(userId?: string): Promise<string> {
  const [
    events, elections, projects, businesses, userCount, yearGroups,
    recentPosts, recentDues, tickets, announcements,
  ] = await Promise.all([
    prisma.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 5, select: { title: true, startsAt: true, venue: true } }),
    prisma.election.findMany({ where: { status: 'OPEN' }, include: { _count: { select: { candidates: true, votes: true } }, candidates: { include: { user: { select: { profile: { select: { fullName: true } } } } } } }, take: 5 }),
    prisma.project.findMany({ where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } }, select: { title: true, targetAmount: true, raisedAmount: true, status: true }, take: 5 }),
    prisma.business.findMany({ where: { verified: true }, select: { name: true, category: true, location: true }, take: 5 }),
    prisma.user.count(),
    prisma.yearGroup.findMany({ select: { year: true, name: true, _count: { select: { memberships: { where: { banned: false } } } } }, orderBy: { year: 'desc' }, take: 20 }),
    prisma.yearGroupPost.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { body: true, createdAt: true, yearGroup: { select: { name: true, year: true } }, user: { select: { profile: { select: { fullName: true } } } } } }),
    prisma.payment.findMany({ where: { status: 'PAID' }, orderBy: { createdAt: 'desc' }, take: 5, select: { amount: true, purpose: true, createdAt: true, user: { select: { profile: { select: { fullName: true } } } } } }),
    prisma.supportTicket.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }, take: 3, select: { subject: true, status: true } }),
    prisma.notification.findMany({ where: { type: 'ANNOUNCEMENT' }, orderBy: { createdAt: 'desc' }, take: 3, select: { title: true, body: true, createdAt: true } }),
  ]);

  // Get user-specific context if userId provided
  let userContext = '';
  if (userId) {
    const [userProfile, userDues, userGroups, userNotifications] = await Promise.all([
      prisma.alumniProfile.findUnique({ where: { userId }, select: { fullName: true, nickname: true, gender: true, graduationYear: true, house: true, profession: true, country: true, city: true } }),
      prisma.payment.findMany({ where: { userId, status: 'PAID' }, select: { amount: true, purpose: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.yearGroupMembership.findMany({ where: { userId, banned: false }, include: { yearGroup: { select: { name: true, year: true } } } }),
      prisma.notification.findMany({ where: { userId, read: false }, take: 5, select: { title: true, type: true } }),
    ]);
    if (userProfile) {
      const firstName = userProfile.fullName?.split(' ')[0] || '';
      const title = honorific(userProfile.gender);
      userContext = `\nCURRENT USER INFO:
- Name: ${userProfile.fullName}, Nickname: ${userProfile.nickname || 'POPASSION'}
- How to address this user: "${title}" (or "${title} ${firstName}") — ${userProfile.gender === 'FEMALE' ? 'she is female, so use "Obaa Panin", never "Opanin"' : userProfile.gender === 'MALE' ? 'he is male, so use "Opanin"' : 'gender not set, default to "Opanin"'}
- Class of ${userProfile.graduationYear}, House: ${userProfile.house || 'Not set'}
- Profession: ${userProfile.profession || 'Not set'}, Location: ${[userProfile.city, userProfile.country].filter(Boolean).join(', ') || 'Not set'}
- Joined year groups: ${userGroups.map(g => `${g.yearGroup.name} (${g.yearGroup.year})`).join(', ') || 'None'}
- Dues paid: ${userDues.length > 0 ? userDues.map(d => `GHS ${d.amount} (${d.purpose})`).join(', ') : 'None'}
- Unread notifications: ${userNotifications.length}`;
    }
  }

  const eventStr = events.length ? events.map(e => `${e.title} on ${new Date(e.startsAt).toLocaleDateString()} at ${e.venue || 'TBD'}`).join('; ') : 'No upcoming events';
  const electionStr = elections.length ? elections.map(e => `${e.title}: ${e._count.candidates} candidates, ${e._count.votes} votes. Candidates: ${e.candidates.map(c => c.user?.profile?.fullName || 'Unknown').join(', ')}`).join('; ') : 'No active elections';
  const projectStr = projects.length ? projects.map(p => `${p.title}: GHS ${Number(p.raisedAmount).toLocaleString()} of GHS ${Number(p.targetAmount).toLocaleString()} (${p.status})`).join('; ') : 'No active projects';
  const businessStr = businesses.length ? businesses.map(b => `${b.name} (${b.category}${b.location ? ', ' + b.location : ''})`).join('; ') : 'No verified businesses';
  const ygStr = yearGroups.length ? yearGroups.map(y => `${y.year} (${y.name}, ${y._count.memberships} members)`).join(', ') : 'No year groups';
  const postStr = recentPosts.length ? recentPosts.map(p => `"${p.body?.slice(0, 60)}..." in ${p.yearGroup.name} by ${p.user?.profile?.fullName || 'Unknown'}`).join('; ') : 'No recent posts';
  const duesStr = recentDues.length ? recentDues.map(d => `GHS ${d.amount} (${d.purpose}) by ${d.user?.profile?.fullName || 'Unknown'}`).join('; ') : 'No recent dues';
  const ticketStr = tickets.length ? tickets.map(t => `${t.subject} (${t.status})`).join('; ') : 'No open tickets';
  const announceStr = announcements.length ? announcements.map(a => `${a.title}: ${a.body?.slice(0, 80)}`).join('; ') : 'No announcements';

  return `CURRENT SITE DATA (live platform data — use this to answer questions):
- Total registered users: ${userCount}
- Upcoming events: ${eventStr}
- Active elections: ${electionStr}
- Active projects: ${projectStr}
- Verified businesses: ${businessStr}
- Year groups: ${ygStr}
- Recent year group posts: ${postStr}
- Recent dues payments: ${duesStr}
- Open support tickets: ${ticketStr}
- Recent announcements: ${announceStr}${userContext}`;
}
