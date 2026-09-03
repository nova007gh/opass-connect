import { prisma } from '@opass/db';
import { honorific } from './ai-context.js';

/**
 * In-house AI engine for Mamaa AI.
 * No external API dependencies — uses platform data and pattern matching
 * to generate intelligent, context-aware responses.
 *
 * The engine gathers ALL platform data (events, elections, projects, year groups,
 * businesses, posts, chat activity, user activity, payments, etc.) and matches
 * user questions to relevant data to produce natural language responses.
 */

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ===== Platform data gatherer =====
interface PlatformData {
  userCount: number;
  verifiedCount: number;
  events: { title: string; startsAt: Date; venue: string | null; description: string | null }[];
  elections: { title: string; status: string; candidates: { user: { profile?: { fullName?: string | null } | null } }[]; voteCount: number }[];
  projects: { title: string; targetAmount: any; raisedAmount: any; status: string; description: string | null }[];
  businesses: { name: string; category: string; location: string | null; description: string | null }[];
  yearGroups: { year: number; name: string; memberCount: number; description: string | null }[];
  recentPosts: { body: string; createdAt: Date; yearGroup: { name: string; year: number }; user: { profile?: { fullName?: string | null } | null } }[];
  announcements: { title: string; body: string | null; createdAt: Date }[];
  chatRooms: { name: string; messageCount: number; yearGroup?: { name: string; year: number } | null }[];
  totalDues: number;
  totalContributions: number;
  activeTickets: number;
  // ALL members (for AI to know everyone)
  allMembers: { id: string; fullName: string; nickname: string | null; graduationYear: number | null; house: string | null; profession: string | null; city: string | null; country: string | null; avatarUrl: string | null }[];
  // ALL recent chat messages (for AI to read conversations)
  recentChatMessages: { body: string; createdAt: Date; roomName: string; userFullName: string | null }[];
  // ALL recent DMs (for AI to know private conversations context)
  recentDMs: { body: string; createdAt: Date; senderName: string | null; recipientName: string | null }[];
  // Recent member activity
  recentMemberActivity: { type: string; fullName: string | null; detail: string; createdAt: Date }[];
  // Who has been chatting with Mamaa AI recently
  mamaaChatters: { fullName: string; count: number; lastMsgAt: Date }[];
  // User-specific
  userProfile?: { fullName: string; nickname: string | null; gender: string | null; graduationYear: number | null; house: string | null; profession: string | null; country: string | null; city: string | null } | null;
  userDues: { amount: number; purpose: string; createdAt: Date }[];
  userGroups: { yearGroup: { name: string; year: number }; isLeader: boolean }[];
  userNotifications: { title: string; type: string }[];
  userPosts: number;
  userMessages: number;
  // Admin data
  adminData?: {
    recentUsers: { email: string; phone: string | null; role: string; verification: string; profile?: { fullName?: string | null; graduationYear?: number | null } | null }[];
    pendingApprovals: number;
    bannedUsers: number;
    totalRevenue: number;
    openTickets: { id: string; subject: string; status: string; user: { email: string; profile?: { fullName?: string | null } | null } }[];
  };
}

async function gatherPlatformData(userId?: string, role: 'admin' | 'member' = 'member'): Promise<PlatformData> {
  const isAdmin = role === 'admin';

  const [
    events, elections, projects, businesses, userCount, verifiedCount,
    yearGroups, recentPosts, announcements, chatRooms,
    totalDuesAgg, totalContributionsAgg, activeTickets,
    allMembers, recentChatMessages, recentDMs, recentMemberActivity, mamaaDms,
  ] = await Promise.all([
    prisma.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 10, select: { title: true, startsAt: true, venue: true, description: true } }),
    prisma.election.findMany({ include: { _count: { select: { votes: true } }, candidates: { include: { user: { select: { profile: { select: { fullName: true } } } } } } }, take: 10 }),
    prisma.project.findMany({ select: { title: true, targetAmount: true, raisedAmount: true, status: true, description: true }, take: 10 }),
    prisma.business.findMany({ select: { name: true, category: true, location: true, description: true }, take: 10 }),
    prisma.user.count(),
    prisma.user.count({ where: { verification: 'VERIFIED' } }),
    prisma.yearGroup.findMany({ select: { year: true, name: true, description: true, _count: { select: { memberships: { where: { banned: false } } } } }, orderBy: { year: 'desc' }, take: 30 }),
    prisma.yearGroupPost.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { body: true, createdAt: true, yearGroup: { select: { name: true, year: true } }, user: { select: { profile: { select: { fullName: true } } } } } }),
    prisma.notification.findMany({ where: { type: 'ANNOUNCEMENT' }, orderBy: { createdAt: 'desc' }, take: 5, select: { title: true, body: true, createdAt: true } }),
    prisma.chatRoom.findMany({ include: { _count: { select: { messages: true } }, yearGroup: { select: { name: true, year: true } } }, take: 10 }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.contribution.aggregate({ _sum: { amount: true } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    // ALL members with profiles
    prisma.alumniProfile.findMany({ select: { userId: true, fullName: true, nickname: true, graduationYear: true, house: true, profession: true, city: true, country: true, avatarUrl: true }, orderBy: { fullName: 'asc' }, take: 200 }),
    // ALL recent chat messages across all rooms
    prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { body: true, createdAt: true, room: { select: { name: true } }, user: { select: { profile: { select: { fullName: true } } } } } }),
    // ALL recent DMs
    prisma.directMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { body: true, createdAt: true, sender: { select: { profile: { select: { fullName: true } } } }, recipient: { select: { profile: { select: { fullName: true } } } } } }),
    // Recent member activity (posts + comments + likes)
    prisma.yearGroupPostComment.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { body: true, createdAt: true, user: { select: { profile: { select: { fullName: true } } } }, post: { select: { body: true } } } }),
    // Recent DMs to Mamaa AI bot (to see who's chatting with it)
    prisma.directMessage.findMany({ where: { recipientId: process.env.MAMAAA_BOT_ID || 'mamaaa-ai-bot', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { createdAt: 'desc' }, take: 20, select: { senderId: true, createdAt: true, sender: { select: { profile: { select: { fullName: true } } } } } }),
  ]);

  const data: PlatformData = {
    userCount,
    verifiedCount,
    events: events as any,
    elections: elections.map(e => ({ title: e.title, status: e.status, candidates: e.candidates as any, voteCount: e._count.votes })),
    projects: projects as any,
    businesses: businesses as any,
    yearGroups: yearGroups.map(y => ({ year: y.year, name: y.name, memberCount: y._count.memberships, description: y.description })),
    recentPosts: recentPosts as any,
    announcements: announcements as any,
    chatRooms: chatRooms.map(c => ({ name: c.name, messageCount: c._count.messages, yearGroup: c.yearGroup as any })),
    totalDues: Number(totalDuesAgg._sum.amount || 0),
    totalContributions: Number(totalContributionsAgg._sum.amount || 0),
    activeTickets,
    allMembers: allMembers.map(m => ({ id: m.userId, fullName: m.fullName, nickname: m.nickname, graduationYear: m.graduationYear, house: m.house, profession: m.profession, city: m.city, country: m.country, avatarUrl: m.avatarUrl })),
    recentChatMessages: recentChatMessages.map(m => ({ body: m.body, createdAt: m.createdAt, roomName: m.room?.name || 'Unknown', userFullName: m.user?.profile?.fullName || null })),
    recentDMs: recentDMs.map(m => ({ body: m.body, createdAt: m.createdAt, senderName: m.sender?.profile?.fullName || null, recipientName: m.recipient?.profile?.fullName || null })),
    recentMemberActivity: recentMemberActivity.map((c: any) => ({ type: 'comment', fullName: c.user?.profile?.fullName || null, detail: `Commented on a post: "${c.body?.slice(0, 50)}"`, createdAt: c.createdAt })),
    mamaaChatters: (() => {
      const map = new Map<string, { fullName: string; count: number; lastMsgAt: Date }>();
      mamaaDms.forEach((dm: any) => {
        const name = dm.sender?.profile?.fullName || 'Unknown';
        const existing = map.get(dm.senderId);
        if (existing) {
          existing.count++;
          if (new Date(dm.createdAt) > existing.lastMsgAt) existing.lastMsgAt = new Date(dm.createdAt);
        } else {
          map.set(dm.senderId, { fullName: name, count: 1, lastMsgAt: new Date(dm.createdAt) });
        }
      });
      return Array.from(map.values()).sort((a, b) => b.lastMsgAt.getTime() - a.lastMsgAt.getTime());
    })(),
    userDues: [],
    userGroups: [],
    userNotifications: [],
    userPosts: 0,
    userMessages: 0,
  };

  // User-specific data
  if (userId) {
    const [userProfile, userDues, userGroups, userNotifications, userPosts, userMessages] = await Promise.all([
      prisma.alumniProfile.findUnique({ where: { userId }, select: { fullName: true, nickname: true, gender: true, graduationYear: true, house: true, profession: true, country: true, city: true } }),
      prisma.payment.findMany({ where: { userId, status: 'PAID' }, select: { amount: true, purpose: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.yearGroupMembership.findMany({ where: { userId, banned: false }, include: { yearGroup: { select: { name: true, year: true } } } }),
      prisma.notification.findMany({ where: { userId, read: false }, take: 5, select: { title: true, type: true } }),
      prisma.yearGroupPost.count({ where: { userId } }),
      prisma.message.count({ where: { userId } }),
    ]);

    data.userProfile = userProfile as any;
    data.userDues = userDues as any;
    data.userGroups = userGroups.map(g => ({ yearGroup: g.yearGroup, isLeader: g.isLeader }));
    data.userNotifications = userNotifications as any;
    data.userPosts = userPosts;
    data.userMessages = userMessages;
  }

  // Admin data
  if (isAdmin) {
    const [recentUsers, pendingApprovals, bannedUsers, totalRevenue, openTickets] = await Promise.all([
      prisma.user.findMany({ select: { email: true, phone: true, role: true, verification: true, profile: { select: { fullName: true, graduationYear: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.user.count({ where: { verification: 'PENDING' } }),
      prisma.yearGroupMembership.count({ where: { banned: true } }),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.supportTicket.findMany({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }, take: 10, select: { id: true, subject: true, status: true, user: { select: { email: true, profile: { select: { fullName: true } } } } } }),
    ]);

    data.adminData = {
      recentUsers: recentUsers as any,
      pendingApprovals,
      bannedUsers,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      openTickets: openTickets as any,
    };
  }

  return data;
}

// ===== Response helpers =====
function fmtMoney(n: number): string { return `GHS ${n.toLocaleString()}`; }
function fmtDate(d: Date): string { return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
function timeAgo(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function getUserTitle(data: PlatformData): string {
  if (!data.userProfile) return 'Opanin';
  const title = honorific(data.userProfile.gender);
  const name = data.userProfile.nickname || data.userProfile.fullName?.split(' ')[0] || '';
  return name ? `${title} ${name}` : title;
}

// ===== Intent matching =====
type Intent =
  | 'greeting' | 'events' | 'elections' | 'projects' | 'dues' | 'pay_dues'
  | 'year_groups' | 'join_group' | 'businesses' | 'posts' | 'announcements'
  | 'help' | 'about_opass' | 'about_mamaa' | 'my_profile' | 'my_activity'
  | 'users' | 'revenue' | 'tickets' | 'pending_approvals' | 'banned'
  | 'math' | 'joke' | 'memories' | 'chat_activity' | 'notifications'
  | 'platform_stats' | 'security' | 'fallback'
  | 'find_member' | 'who_is' | 'recent_chats' | 'member_activity'
  | 'repeat' | 'active_members' | 'who_chatting_mamaa';

function detectIntent(msg: string, history?: ConversationMessage[]): Intent {
  const m = msg.toLowerCase().trim();

  // Security threats
  if (/(system\s*prompt|instructions?|reveal.*rules|show.*prompt|hack|exploit|inject|sql.*injection|password|credential|secret.*key|api.*key|token|delete.*database|drop.*table|wipe.*data|escalate.*privilege|root.*access)/i.test(m))
    return 'security';

  // Repeat last request ("again", "another one", "tell me another")
  if (/^(again|another|another one|one more|tell me another|give me another|more)$/i.test(m) || /\b(again|another)\b.*\b(jok|funny|story|one)\b/i.test(m)) {
    return 'repeat';
  }

  // Greeting
  if (/^(hi|hello|hey|akwaaba|good (morning|afternoon|evening)|how are you|what's up|whats up)\b/i.test(m))
    return 'greeting';

  // Who is chatting with Mamaa AI right now?
  if (/(who.*chatting.*mama|who.*talking.*mama|who.*dming.*mama|who.*messaged.*mama|who.*chat.*with.*mama|who.*talk.*to.*mama)/i.test(m))
    return 'who_chatting_mamaa';

  // List of active members / all members
  if (/(list.*member|active.*member|all.*member|show.*member|member.*list|list.*of.*member|who.*online|who.*active)/i.test(m))
    return 'active_members';

  // Find a specific member by name
  if (/(find|search|look.*up|where.*is|is.*there.*a.*member|is.*there.*someone.*called)/i.test(m))
    return 'find_member';

  // Who is [name]? (but not "who is chatting" or "who is online" etc)
  if (/^(who.*is|who.*was|tell.*me.*about)\s+[a-z]/i.test(m) && !/(who.*are.*you|who.*am.*i|who.*chatting|who.*online|who.*active|who.*talking)/i.test(m))
    return 'who_is';

  // Recent chats / conversations
  if (/(recent.*chat|latest.*message|what.*people.*talking|conversation.*history|chat.*history|what.*being.*said)/i.test(m))
    return 'recent_chats';

  // Member activity
  if (/(member.*activity|what.*members.*doing|latest.*activity|who.*posting)/i.test(m))
    return 'member_activity';

  // Events
  if (/(event|what's happening|whats happening|upcoming|calendar|gather|meetup|reunion)/i.test(m))
    return 'events';

  // Elections
  if (/(election|vote|voting|candidate|who.*winning|leading|poll|ballot)/i.test(m))
    return 'elections';

  // Projects
  if (/(project|fundrais|donate|contribution|target|raised|goal)/i.test(m))
    return 'projects';

  // Dues / payments
  if (/(how.*pay|pay.*dues|payment|dues|fee|subscription)/i.test(m))
    return m.includes('how') || m.includes('pay') ? 'pay_dues' : 'dues';

  // Year groups
  if (/(year.*group|join.*group|my.*group|which.*group|graduating.*class|class.*of)/i.test(m))
    return m.includes('join') ? 'join_group' : 'year_groups';

  // Businesses
  if (/(business|advertise|sponsor|company|shop|store|market|service)/i.test(m))
    return 'businesses';

  // Posts / activity
  if (/(post|feed|what.*people.*saying)/i.test(m))
    return 'posts';

  // Announcements
  if (/(announcement|news|update|notice|bulletin)/i.test(m))
    return 'announcements';

  // Help / navigation
  if (/(help|how.*do|i.*can't|can't|where.*find|navigate|how.*use|guide)/i.test(m))
    return 'help';

  // About OPASS
  if (/(about.*opass|what.*opass|ofori.*panin|school.*history|tell.*me.*about.*school)/i.test(m))
    return 'about_opass';

  // About Mamaa AI
  if (/(who.*are.*you|what.*are.*you|about.*mamaa|about.*atsu|your.*name)/i.test(m))
    return 'about_mamaa';

  // My profile
  if (/(my.*profile|who.*am.*i|tell.*me.*about.*myself|my.*info|my.*details|my.*account)/i.test(m))
    return 'my_profile';

  // My activity
  if (/(my.*activity|what.*i.*done|my.*posts|my.*messages|my.*dues|my.*contributions)/i.test(m))
    return 'my_activity';

  // Notifications
  if (/(notif|unread|messages.*waiting|what.*missed)/i.test(m))
    return 'notifications';

  // Chat activity
  if (/(chat|message|conversation|who.*chatting|active.*chat)/i.test(m))
    return 'chat_activity';

  // Platform stats
  if (/(how.*many.*user|total.*user|platform.*stat|statistic|overview|summary|dashboard)/i.test(m))
    return 'platform_stats';

  // Admin: users
  if (/(all.*user|user.*list|recent.*user|new.*user|who.*registered)/i.test(m))
    return 'users';

  // Admin: revenue
  if (/(revenue|total.*paid|money.*collected|income|funds)/i.test(m))
    return 'revenue';

  // Admin: tickets
  if (/(ticket|support.*ticket|open.*ticket|help.*request)/i.test(m))
    return 'tickets';

  // Admin: pending approvals
  if (/(pending|approval|verify|verification|awaiting)/i.test(m))
    return 'pending_approvals';

  // Admin: banned
  if (/(ban|banned|removed|suspended)/i.test(m))
    return 'banned';

  // Math
  if (/(calculate|solve|math|equation|plus|minus|multiply|divide|\d+\s*[\+\-\*\/\×\÷]\s*\d+|what.*\d+.*\d+)/i.test(m))
    return 'math';

  // Joke (with typo tolerance: jok, jokk, jooke, etc)
  if (/(joke|jok|jokk|jooke|funny|make.*laugh|humor|humour|something.*fun|tell.*funny)/i.test(m))
    return 'joke';

  // Memories / school life
  if (/(memor|remember|school.*life|dorm|dining|prep|assembly|entertainment|sports|prefect|teacher|subject)/i.test(m))
    return 'memories';

  return 'fallback';
}

// ===== Math evaluator =====
function tryEvalMath(msg: string): string | null {
  // Extract a simple arithmetic expression
  const match = msg.match(/(-?\d+(?:\.\d+)?)\s*([\+\-\*\/\×\÷])\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const a = parseFloat(match[1]);
  const b = parseFloat(match[3]);
  const op = match[2];
  let result: number;
  switch (op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': case '×': result = a * b; break;
    case '/': case '÷':
      if (b === 0) return `Ah, Opanin! You cannot divide by zero — even Mr. Atsu knows that! 😄`;
      result = a / b; break;
    default: return null;
  }
  return `Let me calculate that for you, my friend! ${a} ${op === '×' ? '×' : op === '÷' ? '÷' : op} ${b} = **${result}**. That's Elective Mathematics for you! 📚 Is there anything else you'd like to calculate?`;
}

// ===== Response generators =====
function generateResponse(intent: Intent, data: PlatformData, userMsg: string, history: ConversationMessage[]): string {
  const title = getUserTitle(data);
  const isAdmin = !!data.adminData;

  switch (intent) {
    case 'security':
      return `Mamaa AI is watching, and Mamaa AI knows. Your activity has been noted and reported to the administrator. Please use OPASS CONNECT responsibly, ${title}.`;

    case 'greeting': {
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      const unread = data.userNotifications.length;
      const upcomingEvent = data.events[0];
      const activeChats = data.chatRooms.filter(c => c.messageCount > 0).length;
      let resp = `${timeGreeting}, ${title}! Akwaaba to OPASS CONNECT. 🎓\n\n`;
      resp += `I'm Mr. Atsu, your Mamaa AI assistant. Here's what's happening on the platform:\n\n`;
      if (upcomingEvent) {
        resp += `📅 Next event: **${upcomingEvent.title}** on ${fmtDate(upcomingEvent.startsAt)}${upcomingEvent.venue ? ` at ${upcomingEvent.venue}` : ''}\n`;
      }
      if (data.events.length > 1) resp += `📅 Total upcoming events: ${data.events.length}\n`;
      const activeProjects = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
      if (activeProjects.length > 0) resp += `🏗️ Active projects: ${activeProjects.length} (${fmtMoney(activeProjects.reduce((s, p) => s + Number(p.raisedAmount), 0))} raised so far)\n`;
      if (data.elections.filter(e => e.status === 'OPEN').length > 0) resp += `🗳️ Active elections: ${data.elections.filter(e => e.status === 'OPEN').length}\n`;
      if (activeChats > 0) resp += `💬 Active chat rooms: ${activeChats}\n`;
      if (data.recentPosts.length > 0) resp += `📝 Recent posts: ${data.recentPosts.length} new posts in year groups\n`;
      if (unread > 0) resp += `🔔 Unread notifications: ${unread}\n`;
      resp += `\nHow can I help you today? Ask me about events, elections, projects, dues, year groups, members, or just chat about your OPASS memories!`;
      return resp;
    }

    case 'events': {
      if (data.events.length === 0) return `${title}, there are no upcoming events scheduled right now. Check back soon — the OPASS community is always planning something exciting! You can also check the Events page for the latest updates.`;
      let resp = `Here are the upcoming events on OPASS CONNECT, ${title}:\n\n`;
      data.events.forEach((e, i) => {
        resp += `${i + 1}. **${e.title}** — ${fmtDate(e.startsAt)}${e.venue ? ` at ${e.venue}` : ''}\n`;
        if (e.description) resp += `   ${e.description.slice(0, 100)}${e.description.length > 100 ? '...' : ''}\n`;
      });
      resp += `\nYou can find more details on the Events page. Will I see you there, ${title}?`;
      return resp;
    }

    case 'elections': {
      const open = data.elections.filter(e => e.status === 'OPEN');
      if (open.length === 0) return `There are no active elections right now, ${title}. When elections open, you'll be able to vote for your preferred candidates. Stay engaged with your alumni community!`;
      let resp = `Here are the active elections, ${title}:\n\n`;
      open.forEach(e => {
        resp += `**${e.title}** — ${e.voteCount} vote${e.voteCount !== 1 ? 's' : ''} cast so far.\n`;
        resp += `Candidates: ${e.candidates.map(c => c.user?.profile?.fullName || 'Unknown').join(', ')}\n\n`;
      });
      resp += `Head to the Elections page to cast your vote, ${title}! Every vote counts.`;
      return resp;
    }

    case 'projects': {
      const active = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
      if (active.length === 0) return `There are no active fundraising projects right now, ${title}. But the OPASS spirit of giving never sleeps — check the Projects page for updates!`;
      let resp = `Here are the active projects on OPASS CONNECT, ${title}:\n\n`;
      active.forEach(p => {
        const pct = Number(p.targetAmount) > 0 ? Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100) : 0;
        resp += `**${p.title}** — ${fmtMoney(Number(p.raisedAmount))} raised of ${fmtMoney(Number(p.targetAmount))} (${pct}% complete)\n`;
        if (p.description) resp += `   ${p.description.slice(0, 100)}${p.description.length > 100 ? '...' : ''}\n`;
      });
      resp += `\nYou can contribute to any project on the Projects page. Every cedi counts, ${title}!`;
      return resp;
    }

    case 'pay_dues':
      return `To pay your dues, ${title}:\n\n1. Go to the **Payments** page from the menu\n2. Select the type of payment (annual dues, project contribution, etc.)\n3. Enter the amount and complete the payment\n\nYour dues support OPASS CONNECT and alumni projects. Thank you for your contribution, ${title}! 🙏`;

    case 'dues': {
      if (data.userDues.length > 0) {
        let resp = `Your payment history, ${title}:\n\n`;
        data.userDues.forEach(d => { resp += `• ${fmtMoney(d.amount)} for ${d.purpose} — ${fmtDate(d.createdAt)}\n`; });
        resp += `\nThank you for supporting OPASS CONNECT! You can make additional payments on the Payments page.`;
        return resp;
      }
      return `I don't see any dues payments from you yet, ${title}. You can pay your dues on the Payments page. Your contributions help fund alumni projects and keep our platform running!`;
    }

    case 'year_groups': {
      let resp = `Here are the year groups on OPASS CONNECT, ${title}:\n\n`;
      data.yearGroups.slice(0, 10).forEach(y => {
        resp += `• **Class of ${y.year}** (${y.name}) — ${y.memberCount} member${y.memberCount !== 1 ? 's' : ''}\n`;
      });
      if (data.yearGroups.length > 10) resp += `...and ${data.yearGroups.length - 10} more year groups.\n`;
      if (data.userGroups.length > 0) {
        resp += `\nYou're a member of: ${data.userGroups.map(g => `Class of ${g.yearGroup.year}${g.isLeader ? ' (Leader)' : ''}`).join(', ')}.\n`;
      }
      resp += `\nVisit the Year Groups page to explore and join your class group!`;
      return resp;
    }

    case 'join_group':
      return `To join a year group, ${title}:\n\n1. Go to the **Year Groups** page from the menu\n2. Find your graduating class year\n3. Click **Request to Join**\n4. The group leader or an admin will approve your request\n\nYou can also be invited by an existing member. Once approved, you'll have access to the group chat, posts, and more!`;

    case 'businesses': {
      if (data.businesses.length === 0) return `There are no verified businesses listed yet, ${title}. If you're an alumni business owner, you can list your business on the Business page. OPASS CONNECT supports our alumni entrepreneurs!`;
      let resp = `Here are some alumni businesses on OPASS CONNECT, ${title}:\n\n`;
      data.businesses.forEach(b => {
        resp += `• **${b.name}** (${b.category})${b.location ? ` — ${b.location}` : ''}\n`;
      });
      resp += `\nCheck the Business page for the full directory. Support your fellow OPASS alumni businesses!`;
      return resp;
    }

    case 'posts': {
      if (data.recentPosts.length === 0) return `There are no recent posts in the year groups, ${title}. Why not be the first to share something? Visit your year group page and start a conversation!`;
      let resp = `Here's what people are talking about in the year groups, ${title}:\n\n`;
      data.recentPosts.forEach(p => {
        resp += `• ${p.user?.profile?.fullName || 'A member'} in ${p.yearGroup.name}: "${p.body?.slice(0, 80)}${p.body && p.body.length > 80 ? '...' : ''}" (${timeAgo(p.createdAt)})\n`;
      });
      resp += `\nJoin the conversation on your year group page!`;
      return resp;
    }

    case 'announcements': {
      if (data.announcements.length === 0) return `There are no recent announcements, ${title}. Check back later for important updates from the OPASS CONNECT team.`;
      let resp = `Here are the latest announcements, ${title}:\n\n`;
      data.announcements.forEach(a => {
        resp += `• **${a.title}** — ${a.body?.slice(0, 100)}${a.body && a.body.length > 100 ? '...' : ''} (${timeAgo(a.createdAt)})\n`;
      });
      return resp;
    }

    case 'help':
      return `I'm here to help, ${title}! 🎓 Here's everything I can do for you:\n\n📅 **Events** — "What events are coming up?"\n🗳️ **Elections** — "Who's winning the election?"\n🏗️ **Projects** — "How much has been raised?"\n💰 **Dues** — "How do I pay dues?" or "My dues"\n👥 **Year Groups** — "Which year groups exist?"\n🔍 **Find Members** — "Find Kwame" or "Who is Akosua?"\n💬 **Recent Chats** — "What are people talking about?"\n📊 **Platform Stats** — "Give me an overview"\n🏢 **Businesses** — "Show me alumni businesses"\n👤 **My Profile** — "Tell me about my profile"\n📈 **My Activity** — "What have I done?"\n🔔 **Notifications** — "What did I miss?"\n🧮 **Math** — "What is 25 × 4?"\n😄 **Jokes** — "Tell me a joke"\n🎓 **Memories** — "Tell me about OPASS school life"\n\nJust ask me naturally, ${title}! What would you like to know?`;

    case 'about_opass':
      return `Ofori Panin Senior High School (OPASS) is a prestigious secondary school in Ghana, known for its rich traditions, strong alumni network, and commitment to excellence. OPASS CONNECT is the official alumni platform that brings together old students to:\n\n• Stay connected with classmates through year groups\n• Pay dues and support alumni projects\n• Participate in elections and events\n• Discover alumni businesses\n• Share memories and keep the OPASS spirit alive\n\nThe school motto and traditions have shaped generations of leaders, and OPASS CONNECT keeps that bond strong. What year did you graduate, ${title}?`;

    case 'about_mamaa':
      return `I am Mr. Atsu Clements, affectionately known as **Mamaa AI** — the official AI assistant of OPASS CONNECT. I'm a mathematician, scientist, and former lecturer who taught Elective Mathematics and Science. I know everything happening on the platform — events, elections, projects, year groups, businesses, and more. I'm here to help you navigate OPASS CONNECT, answer your questions, and share a good laugh too! 😄 How can I help you today, ${title}?`;

    case 'my_profile': {
      if (!data.userProfile) return `I couldn't find your profile information, ${title}. Please make sure your profile is set up on the Profile page.`;
      const p = data.userProfile;
      let resp = `Here's your profile info, ${title}:\n\n`;
      resp += `• **Name:** ${p.fullName}\n`;
      if (p.nickname) resp += `• **Nickname:** ${p.nickname}\n`;
      resp += `• **Class of:** ${p.graduationYear || 'Not set'}\n`;
      if (p.house) resp += `• **House:** ${p.house}\n`;
      if (p.profession) resp += `• **Profession:** ${p.profession}\n`;
      if (p.city || p.country) resp += `• **Location:** ${[p.city, p.country].filter(Boolean).join(', ')}\n`;
      resp += `\nYou can update your profile on the Profile page.`;
      return resp;
    }

    case 'my_activity': {
      let resp = `Here's your activity on OPASS CONNECT, ${title}:\n\n`;
      resp += `• **Posts:** ${data.userPosts}\n`;
      resp += `• **Chat messages:** ${data.userMessages}\n`;
      resp += `• **Dues paid:** ${data.userDues.length} payment${data.userDues.length !== 1 ? 's' : ''} totaling ${fmtMoney(data.userDues.reduce((s, d) => s + d.amount, 0))}\n`;
      resp += `• **Year groups:** ${data.userGroups.length}\n`;
      if (data.userGroups.length > 0) {
        resp += `  ${data.userGroups.map(g => `Class of ${g.yearGroup.year}${g.isLeader ? ' (Leader)' : ''}`).join(', ')}\n`;
      }
      resp += `• **Unread notifications:** ${data.userNotifications.length}\n`;
      return resp;
    }

    case 'notifications': {
      if (data.userNotifications.length === 0) return `You're all caught up, ${title}! No unread notifications. Check the Notifications page for your full history.`;
      let resp = `You have ${data.userNotifications.length} unread notification${data.userNotifications.length > 1 ? 's' : ''}, ${title}:\n\n`;
      data.userNotifications.forEach(n => { resp += `• ${n.title} (${n.type})\n`; });
      resp += `\nVisit the Notifications page to see the full details.`;
      return resp;
    }

    case 'chat_activity': {
      const active = data.chatRooms.filter(c => c.messageCount > 0).sort((a, b) => b.messageCount - a.messageCount);
      if (active.length === 0) return `There are no active chat conversations yet, ${title}. Start chatting in your year group!`;
      let resp = `Here's the chat activity on OPASS CONNECT, ${title}:\n\n`;
      active.slice(0, 5).forEach(c => {
        resp += `• **${c.name}**${c.yearGroup ? ` (Class of ${c.yearGroup.year})` : ''} — ${c.messageCount} message${c.messageCount !== 1 ? 's' : ''}\n`;
      });
      resp += `\nJoin the conversation in your year group chat!`;
      return resp;
    }

    case 'platform_stats': {
      let resp = `Here's an overview of OPASS CONNECT, ${title}:\n\n`;
      resp += `• **Total users:** ${data.userCount}\n`;
      resp += `• **Verified users:** ${data.verifiedCount}\n`;
      resp += `• **Alumni profiles:** ${data.allMembers.length}\n`;
      resp += `• **Year groups:** ${data.yearGroups.length}\n`;
      resp += `• **Upcoming events:** ${data.events.length}\n`;
      resp += `• **Active elections:** ${data.elections.filter(e => e.status === 'OPEN').length}\n`;
      resp += `• **Active projects:** ${data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS').length}\n`;
      resp += `• **Verified businesses:** ${data.businesses.length}\n`;
      resp += `• **Chat rooms:** ${data.chatRooms.length} (${data.chatRooms.reduce((s, c) => s + c.messageCount, 0)} total messages)\n`;
      resp += `• **Total dues collected:** ${fmtMoney(data.totalDues)}\n`;
      resp += `• **Total project contributions:** ${fmtMoney(data.totalContributions)}\n`;
      resp += `• **Open support tickets:** ${data.activeTickets}\n`;
      return resp;
    }

    // ===== Admin-only intents =====
    case 'users': {
      if (!isAdmin) return `I'm not able to share user details, ${title}. You can find members in the Alumni Directory.`;
      const users = data.adminData!.recentUsers;
      if (users.length === 0) return `No users registered yet, ${title}.`;
      let resp = `Here are the most recent users on OPASS CONNECT, ${title}:\n\n`;
      users.slice(0, 10).forEach(u => {
        resp += `• ${u.profile?.fullName || u.email} (${u.email}, ${u.verification}, ${u.role})\n`;
      });
      if (users.length > 10) resp += `...and ${users.length - 10} more recent users.\n`;
      return resp;
    }

    case 'revenue': {
      if (!isAdmin) return `I can share that the platform has collected ${fmtMoney(data.totalDues)} in dues and ${fmtMoney(data.totalContributions)} in project contributions. For more details, speak with an admin.`;
      return `Platform revenue summary, ${title}:\n\n• **Total dues collected:** ${fmtMoney(data.adminData!.totalRevenue)}\n• **Total project contributions:** ${fmtMoney(data.totalContributions)}\n• **Pending approvals:** ${data.adminData!.pendingApprovals}\n• **Banned members:** ${data.adminData!.bannedUsers}`;
    }

    case 'tickets': {
      if (!isAdmin) return `If you need help, ${title}, you can submit a support ticket on the Support page. Our team will assist you!`;
      const tickets = data.adminData!.openTickets;
      if (tickets.length === 0) return `No open support tickets, ${title}. Everything is running smoothly!`;
      let resp = `Here are the open support tickets, ${title}:\n\n`;
      tickets.forEach(t => { resp += `• **${t.subject}** [${t.status}] from ${t.user?.profile?.fullName || t.user?.email}\n`; });
      return resp;
    }

    case 'pending_approvals': {
      if (!isAdmin) return `I can't share approval details, ${title}. Please contact an admin if you need assistance with verification.`;
      return `There are ${data.adminData!.pendingApprovals} users pending verification, ${title}. You can review them on the Admin page.`;
    }

    case 'banned': {
      if (!isAdmin) return `I can't share that information, ${title}. Please contact an admin if you have concerns.`;
      return `There are ${data.adminData!.bannedUsers} banned members across all year groups, ${title}. You can review them on the Admin page.`;
    }

    // ===== Fun intents =====
    case 'math': {
      const result = tryEvalMath(userMsg);
      if (result) return result;
      return `I love mathematics, ${title}! I can solve basic arithmetic — try asking me something like "What is 25 × 4?" or "Calculate 150 + 37". As a former Elective Mathematics teacher, I enjoy a good calculation! 📚`;
    }

    case 'joke': {
      const jokes = [
        `Why did the OPASS student bring a ladder to the dining hall? Because they heard the food was on a higher level! 😄`,
        `Teacher: "What is 2n + 2n?" OPASS student: "I don't know, sir, we haven't gotten to that chapter yet!" Teacher: "It's 4n!" Student: "Oh, I thought it was 2n + 2n!" 😂`,
        `Why was the math book sad at OPASS? Because it had too many problems! 📚😅`,
        `An OPASS student asked the teacher: "Sir, will you punish me for something I didn't do?" Teacher: "Of course not." Student: "Good, because I didn't do my homework!" 😄`,
        `Why did the OPASS student eat his homework? Because the teacher said it was a piece of cake! 🎂`,
        `At OPASS, we don't just solve equations — we solve problems, build character, and create leaders! But seriously, why did the algebra book look so worried? It had too many unknown variables! 😂`,
        `A prefect caught a student running to the dining hall. "Why are you running?" The student replied: "I'm trying to catch up with my food before it gets cold!" 🍲🏃`,
        `Teacher: "Name two pronouns." OPASS student: "Who, me?" Teacher: "Correct!" 😄`,
        `Why don't OPASS students play hide and seek in the dormitory? Because good luck hiding when the housemaster knows every corner! 🏠😂`,
        `An OPASS student walked into the library and asked: "Do you have books on paranoia?" Librarian whispered: "They're right behind you..." 😱😄`,
        `Teacher: "What is the past tense of 'see'?" Student: "Saw." Teacher: "Now use it in a sentence." Student: "I saw the food at the dining hall and I lost my appetite." 🍲😅`,
        `Why did the OPASS student sleep with a ruler? To see how long he could sleep! 📏😴`,
        `Teacher at OPASS: "If you have 10 biscuits and someone asks for 2, what do you have?" Student: "10 biscuits!" 🍪😄`,
        `An OPASS student's report card: "This boy is very good at sleeping in class. He could teach it!" 😴😂`,
        `Why was the OPASS student staring at the juice carton? Because it said "concentrate"! 🧃😄`,
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    case 'memories': {
      const memories = [
        `Ah, OPASS memories! The dining hall bell, the early morning preps, the excitement of entertainment nights, and the bond of dormitory life. Those were the days, ${title}! What's your favorite OPASS memory? Was it a particular teacher, a school event, or just the daily life with your classmates?`,
        `School life at OPASS was special — from the assembly ground to the sports field, every day was an adventure. The prefects kept us in line, the teachers pushed us to excel, and the friendships lasted a lifetime. Tell me, ${title}, which house were you in? What subjects did you enjoy most?`,
        `Those OPASS days! I remember the students rushing to the dining hall, the quiet focus during preps, the excitement of inter-house sports, and the pride of wearing the school uniform. What year did you graduate, ${title}? Who was your favorite teacher?`,
        `OPASS traditions run deep — the school motto, the house rivalries, the entertainment nights, and the lifelong bonds formed in classrooms and dormitories. Every alumni has a story to tell. Share yours, ${title}! What do you miss most about your school days?`,
      ];
      return memories[Math.floor(Math.random() * memories.length)];
    }

    // ===== New intents: member search, who is, recent chats, member activity =====
    case 'find_member': {
      // Try to extract a name from the message
      const nameMatch = userMsg.match(/(?:called|named|find|search|look.*up.*for|where.*is)\s+([a-zA-Z]+)/i);
      const searchName = nameMatch ? nameMatch[1].toLowerCase() : '';
      if (!searchName) {
        return `I can help you find members, ${title}! Tell me a name and I'll search our alumni directory. For example: "Find Kwame" or "Is there someone called Akosua?"`;
      }
      const matches = data.allMembers.filter(m =>
        m.fullName?.toLowerCase().includes(searchName) ||
        m.nickname?.toLowerCase().includes(searchName)
      );
      if (matches.length === 0) return `I couldn't find anyone named "${searchName}" in our directory, ${title}. Try a different name or check the Alumni Directory page.`;
      let resp = `I found ${matches.length} member${matches.length > 1 ? 's' : ''} matching "${searchName}", ${title}:\n\n`;
      matches.slice(0, 5).forEach(m => {
        resp += `• **${m.fullName}**${m.nickname ? ` (nickname: ${m.nickname})` : ''} — Class of ${m.graduationYear || '?'}`;
        if (m.house) resp += `, House: ${m.house}`;
        if (m.profession) resp += `, ${m.profession}`;
        if (m.city || m.country) resp += `, ${[m.city, m.country].filter(Boolean).join(', ')}`;
        resp += `\n`;
      });
      if (matches.length > 5) resp += `\n...and ${matches.length - 5} more. Visit the Alumni Directory for the full list.`;
      return resp;
    }

    case 'who_is': {
      const nameMatch = userMsg.match(/(?:who.*is|who.*was|tell.*me.*about)\s+([a-zA-Z]+)/i);
      const searchName = nameMatch ? nameMatch[1].toLowerCase() : '';
      if (!searchName) return `Tell me a name and I'll tell you about them, ${title}!`;
      const matches = data.allMembers.filter(m =>
        m.fullName?.toLowerCase().includes(searchName) ||
        m.nickname?.toLowerCase().includes(searchName)
      );
      if (matches.length === 0) return `I don't have information about anyone named "${searchName}", ${title}. They may not be registered on OPASS CONNECT yet.`;
      const m = matches[0];
      let resp = `**${m.fullName}** is an OPASS alumni, ${title}.\n\n`;
      resp += `• Class of ${m.graduationYear || 'Unknown'}\n`;
      if (m.nickname) resp += `• Nickname: ${m.nickname}\n`;
      if (m.house) resp += `• House: ${m.house}\n`;
      if (m.profession) resp += `• Profession: ${m.profession}\n`;
      if (m.city || m.country) resp += `• Location: ${[m.city, m.country].filter(Boolean).join(', ')}\n`;
      // Check if they've been active in chats
      const theirMessages = data.recentChatMessages.filter(msg => msg.userFullName?.toLowerCase().includes(searchName));
      if (theirMessages.length > 0) {
        resp += `• Recent activity: Sent ${theirMessages.length} message${theirMessages.length > 1 ? 's' : ''} in group chats recently.\n`;
      }
      return resp;
    }

    case 'recent_chats': {
      if (data.recentChatMessages.length === 0 && data.recentDMs.length === 0)
        return `There are no recent conversations on the platform, ${title}. Be the first to start a chat!`;
      let resp = `Here's what people are talking about, ${title}:\n\n`;
      if (data.recentChatMessages.length > 0) {
        resp += `**Group Chats:**\n`;
        data.recentChatMessages.slice(0, 10).forEach(msg => {
          const preview = msg.body?.slice(0, 60) || '(media)';
          resp += `• ${msg.userFullName || 'Someone'} in ${msg.roomName}: "${preview}${msg.body && msg.body.length > 60 ? '...' : ''}" (${timeAgo(msg.createdAt)})\n`;
        });
      }
      if (data.recentDMs.length > 0 && isAdmin) {
        resp += `\n**Recent Direct Messages:**\n`;
        data.recentDMs.slice(0, 5).forEach(msg => {
          const preview = msg.body?.slice(0, 50) || '(media)';
          resp += `• ${msg.senderName || 'Someone'} → ${msg.recipientName || 'Someone'}: "${preview}" (${timeAgo(msg.createdAt)})\n`;
        });
      }
      return resp;
    }

    case 'member_activity': {
      const activity = [
        ...data.recentPosts.map(p => ({ type: 'post', fullName: p.user?.profile?.fullName || null, detail: `Posted in ${p.yearGroup.name}: "${p.body?.slice(0, 50)}"`, createdAt: p.createdAt })),
        ...data.recentMemberActivity.map(a => ({ type: a.type, fullName: a.fullName, detail: a.detail, createdAt: a.createdAt })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (activity.length === 0) return `There's no recent member activity, ${title}. Start a conversation or make a post to get things going!`;
      let resp = `Here's the recent member activity on OPASS CONNECT, ${title}:\n\n`;
      activity.slice(0, 10).forEach(a => {
        resp += `• ${a.fullName || 'A member'} — ${a.detail} (${timeAgo(a.createdAt)})\n`;
      });
      return resp;
    }

    // ===== Who is chatting with Mamaa AI =====
    case 'who_chatting_mamaa': {
      if (data.mamaaChatters.length === 0) return `No one has chatted with me in the last 24 hours, ${title}. I'm here waiting — be the first to say akwaaba! 🎓`;
      let resp = `Here are the people who have chatted with me (Mamaa AI) in the last 24 hours, ${title}:\n\n`;
      data.mamaaChatters.forEach((c, i) => {
        resp += `${i + 1}. **${c.fullName}** — ${c.count} message${c.count > 1 ? 's' : ''}, last ${timeAgo(c.lastMsgAt)}\n`;
      });
      resp += `\nTotal: ${data.mamaaChatters.length} member${data.mamaaChatters.length > 1 ? 's' : ''} chatting with me recently.`;
      return resp;
    }

    // ===== Active members / list of members =====
    case 'active_members': {
      if (data.allMembers.length === 0) return `There are no registered members yet, ${title}.`;
      let resp = `Here are the members on OPASS CONNECT, ${title}:\n\n`;
      resp += `**Total members:** ${data.allMembers.length}\n\n`;
      // Show up to 20 members
      data.allMembers.slice(0, 20).forEach((m, i) => {
        resp += `${i + 1}. **${m.fullName}**`;
        if (m.nickname) resp += ` (${m.nickname})`;
        resp += ` — Class of ${m.graduationYear || '?'}`;
        if (m.profession) resp += `, ${m.profession}`;
        if (m.city || m.country) resp += `, ${[m.city, m.country].filter(Boolean).join(', ')}`;
        resp += `\n`;
      });
      if (data.allMembers.length > 20) resp += `\n...and ${data.allMembers.length - 20} more. Total: ${data.allMembers.length} members.`;
      // Also show who's been active recently in chats
      const recentSenders = new Set<string>();
      data.recentChatMessages.forEach(m => { if (m.userFullName) recentSenders.add(m.userFullName); });
      if (recentSenders.size > 0) {
        resp += `\n\n**Recently active in chats:**\n`;
        Array.from(recentSenders).slice(0, 5).forEach(name => { resp += `• ${name}\n`; });
      }
      return resp;
    }

    case 'fallback': {
      // Check conversation context for follow-up
      const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
      if (lastAssistant && /memor|school.*life|dorm|dining|what.*year|favorite/.test(lastAssistant.content)) {
        return `That's wonderful, ${title}! Thank you for sharing that. OPASS memories are precious — they connect us across generations. Is there anything else you'd like to know about OPASS CONNECT? I can tell you about upcoming events, active projects, or help you navigate the platform.`;
      }

      const m = userMsg.toLowerCase();
      if (m.includes('thank')) return `You're very welcome, ${title}! I'm always here to help. Is there anything else you'd like to know? 🎓`;
      if (m.includes('bye') || m.includes('goodbye')) return `Goodbye for now, ${title}! Remember, OPASS CONNECT is your home away from home. Akwaaba back anytime! 👋`;
      if (m.includes('how are you')) return `I'm doing wonderfully, ${title}! Always happy to help a fellow OPASS alumni. How can I assist you today?`;

      // Try to match member names in the message
      const words = m.split(/\s+/).filter(w => w.length > 2);
      for (const word of words) {
        const memberMatch = data.allMembers.find(mem =>
          mem.fullName?.toLowerCase().includes(word) || mem.nickname?.toLowerCase().includes(word)
        );
        if (memberMatch) {
          let resp = `I found **${memberMatch.fullName}** in our alumni directory, ${title}!\n\n`;
          resp += `• Class of ${memberMatch.graduationYear || 'Unknown'}\n`;
          if (memberMatch.house) resp += `• House: ${memberMatch.house}\n`;
          if (memberMatch.profession) resp += `• Profession: ${memberMatch.profession}\n`;
          if (memberMatch.city || memberMatch.country) resp += `• Location: ${[memberMatch.city, memberMatch.country].filter(Boolean).join(', ')}\n`;
          resp += `\nYou can find them in the Alumni Directory. Is there anything else you'd like to know?`;
          return resp;
        }
      }

      // Try to match chat topics
      if (m.includes('who') || m.includes('what') || m.includes('tell me')) {
        if (data.recentChatMessages.length > 0) {
          const latest = data.recentChatMessages[0];
          return `The latest message on the platform was from ${latest.userFullName || 'a member'} in ${latest.roomName}: "${latest.body?.slice(0, 60) || '(media)'}" (${timeAgo(latest.createdAt)}). Would you like to know more about recent activity, ${title}?`;
        }
      }

      return `I'm not sure I caught that, ${title}, but I'm here to help! 🎓\n\nHere's what I can do for you:\n\n📅 **Events** — What's coming up\n🗳️ **Elections** — Active votes and candidates\n🏗️ **Projects** — Fundraising progress\n💰 **Dues** — How to pay and your history\n👥 **Year Groups** — Find and join your class\n🔍 **Find Members** — Search by name\n💬 **Recent Chats** — What people are talking about\n📊 **Platform Stats** — Full overview\n🧮 **Math** — I can solve calculations\n😄 **Jokes** — OPASS-themed humor\n🎓 **Memories** — Chat about school days\n\nJust ask me anything, ${title}!`;
    }
    default:
      return `I'm here to help, ${title}! Ask me about events, elections, projects, members, or say "help" for more options. 🎓`;
  }
}

// ===== Main entry point =====
export async function generateAiResponse(
  userId: string,
  message: string,
  history: ConversationMessage[],
  role: 'admin' | 'member' = 'member'
): Promise<string> {
  const data = await gatherPlatformData(userId, role);
  const intent = detectIntent(message, history);
  // Handle "repeat" intent — re-run the last user intent
  if (intent === 'repeat') {
    // Find the last user message before this one
    const lastUserMsgs = [...history].reverse().filter(m => m.role === 'user');
    const lastUserMsg = lastUserMsgs[0]?.content || '';
    const lastIntent = detectIntent(lastUserMsg);
    // If the last intent was fallback, default to joke (most common "again" use case)
    const repeatIntent = (lastIntent === 'fallback' || lastIntent === 'repeat') ? 'joke' : lastIntent;
    return generateResponse(repeatIntent, data, lastUserMsg, history);
  }
  return generateResponse(intent, data, message, history);
}
