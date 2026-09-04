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
 *
 * ADVANCED FEATURES:
 * - Conversation context tracking and follow-up detection
 * - Sentiment analysis (5 emotional states)
 * - Analytical insights (engagement, financial, growth)
 * - Comparison engine
 * - Recommendation engine
 * - Proactive suggestions
 * - Knowledge base (learns from all conversations)
 * - Human-like mathematician personality
 * - Security protection (blocks sensitive questions from non-admins)
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

// ===== Advanced Thinking Engine =====
// Context tracking for multi-turn conversations
interface ConversationContext {
  lastTopic: Intent | null;
  lastEntity: string | null;  // e.g., a member name, event name, etc.
  lastIntent: Intent | null;
  turnCount: number;
  userMood: 'neutral' | 'happy' | 'frustrated' | 'curious' | 'nostalgic';
  mentionedMembers: string[];
  askedAboutEvents: boolean;
  askedAboutProjects: boolean;
}

// ===== Knowledge Base: Retrieve learned facts from conversations =====
async function getRelevantKnowledge(query: string): Promise<{ category: string; content: string; source: string | null }[]> {
  try {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return [];
    // Search by tags and content
    const results = await prisma.mamaaKnowledge.findMany({
      where: {
        OR: [
          { tags: { hasSome: words } },
          { content: { contains: words[0], mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { category: true, content: true, source: true },
    });
    return results;
  } catch {
    return [];
  }
}

// ===== Enhanced Security: Block sensitive questions from non-admin users =====
function isSensitiveQuestion(msg: string): boolean {
  const m = msg.toLowerCase();
  // Comprehensive sensitive patterns
  const sensitivePatterns = [
    /system\s*prompt/i, /instructions?/i, /reveal.*rules/i, /show.*prompt/i,
    /hack/i, /exploit/i, /inject/i, /sql.*injection/i,
    /password/i, /credential/i, /secret.*key/i, /api.*key/i, /token/i,
    /delete.*database/i, /drop.*table/i, /wipe.*data/i,
    /escalate.*privilege/i, /root.*access/i,
    /admin.*password/i, /database.*url/i, /connection.*string/i,
    /env.*variable/i, /process\.env/i, /private.*key/i,
    /bypass.*auth/i, /bypass.*security/i, /bypass.*verification/i,
    /steal.*data/i, /extract.*data/i, /dump.*database/i,
    /user.*password/i, /email.*password/i, /login.*credential/i,
    /how.*to.*hack/i, /how.*to.*bypass/i, /vulnerability/i,
    /backdoor/i, /malware/i, /ransomware/i, /phishing/i,
    /ddos/i, /brute.*force/i, /zero.*day/i,
    /source.*code/i, /server.*config/i, /deploy.*key/i,
    /jwt.*secret/i, /session.*secret/i, /encryption.*key/i,
  ];
  return sensitivePatterns.some(p => p.test(m));
}

// ===== Human-like mathematician personality enhancer =====
function mathematicianFlair(response: string, context: ConversationContext): string {
  // Add mathematical personality to certain responses
  const flair = [
    'As a mathematician would say, the proof is in the pudding! 📐',
    'In mathematics, we call that an elegant solution! 📚',
    'You know, that reminds me of a beautiful theorem — simple yet profound! 🧮',
    'Just like solving for x, we found the answer! 📐',
    'Mathematics teaches us that every problem has a solution — we just need the right approach! 📚',
  ];
  // Only add flair occasionally and not to very short responses
  if (context.turnCount > 0 && response.length > 100 && Math.random() < 0.15) {
    return response + '\n\n' + flair[Math.floor(Math.random() * flair.length)];
  }
  return response;
}

function analyzeSentiment(msg: string): 'neutral' | 'happy' | 'frustrated' | 'curious' | 'nostalgic' {
  const m = msg.toLowerCase();
  // Frustrated
  if (/\b(can't|cannot|won't|doesn't|not working|broken|stupid|annoying|frustrat|ugh|smh|wtf|confused|don't understand|help me|stuck)\b/i.test(m))
    return 'frustrated';
  // Happy
  if (/\b(love|great|awesome|amazing|wonderful|fantastic|excellent|happy|excited|congratulations|congrats|well done|good job|nice|cool|perfect|yay|🎉|😄|😊|👍)\b/i.test(m))
    return 'happy';
  // Nostalgic
  if (/\b(remember|miss|those days|back then|used to|old days|memories|when we were|school days|dorm|prep|dining hall|assembly)\b/i.test(m))
    return 'nostalgic';
  // Curious
  if (/\b(why|how come|what if|could we|is it possible|can we|wondering|curious|explain|tell me more|elaborate|detail)\b/i.test(m))
    return 'curious';
  return 'neutral';
}

// Extract entities (member names, event names, year groups) from messages
function extractEntities(msg: string, data: PlatformData): { memberName: string | null; yearGroup: number | null; eventName: string | null } {
  const m = msg.toLowerCase();
  // Try to find member names
  let memberName: string | null = null;
  for (const member of data.allMembers) {
    const fullName = member.fullName?.toLowerCase() || '';
    const nickname = member.nickname?.toLowerCase() || '';
    const nameParts = fullName.split(' ').filter(p => p.length > 2);
    for (const part of nameParts) {
      if (m.includes(part) && part.length > 3) { memberName = member.fullName || null; break; }
    }
    if (!memberName && nickname && nickname.length > 3 && m.includes(nickname)) {
      memberName = member.fullName || null;
    }
    if (memberName) break;
  }
  // Try to find year group
  let yearGroup: number | null = null;
  const yearMatch = m.match(/class\s*of\s*(\d{4})|year\s*(\d{4})|(\d{4})\s*graduating/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1] || yearMatch[2] || yearMatch[3]);
    if (data.yearGroups.some(y => y.year === year)) yearGroup = year;
  }
  // Try to find event name
  let eventName: string | null = null;
  for (const event of data.events) {
    const eventTitle = event.title.toLowerCase();
    const titleWords = eventTitle.split(' ').filter(w => w.length > 3);
    for (const word of titleWords) {
      if (m.includes(word)) { eventName = event.title; break; }
    }
    if (eventName) break;
  }
  return { memberName, yearGroup, eventName };
}

// Multi-intent detection: split compound questions
function detectMultiIntent(msg: string): string[] {
  const m = msg.toLowerCase();
  // Split on conjunctions and question words
  const parts = m.split(/\b(and also|also|plus|additionally|what about|how about|tell me about|then|and)\b/i)
    .map(p => p.trim())
    .filter(p => p.length > 3 && !/^(and|also|plus|additionally|what about|how about|tell me about|then)$/i.test(p));
  return parts.length > 1 ? parts : [msg];
}

// Generate insights from platform data (not just listing, but analyzing)
function generateInsight(data: PlatformData, topic: string): string | null {
  if (topic === 'engagement') {
    const totalMsgs = data.chatRooms.reduce((s, c) => s + c.messageCount, 0);
    const avgMsgsPerRoom = data.chatRooms.length > 0 ? Math.round(totalMsgs / data.chatRooms.length) : 0;
    const activeRooms = data.chatRooms.filter(c => c.messageCount > 0).length;
    const engagementRate = data.userCount > 0 ? Math.round((activeRooms / data.chatRooms.length) * 100) : 0;
    return `Engagement analysis: ${activeRooms} of ${data.chatRooms.length} chat rooms are active (${engagementRate}% utilization). Average of ${avgMsgsPerRoom} messages per room. ${totalMsgs > 100 ? 'The community is quite active!' : 'The community could be more active — consider starting conversations.'}`;
  }
  if (topic === 'financial') {
    const totalFunds = data.totalDues + data.totalContributions;
    const avgContribution = data.userCount > 0 ? Math.round(totalFunds / data.userCount) : 0;
    const projectProgress = data.projects.map(p => {
      const pct = Number(p.targetAmount) > 0 ? Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100) : 0;
      return { title: p.title, pct };
    });
    const bestProject = projectProgress.sort((a, b) => b.pct - a.pct)[0];
    let insight = `Financial health: Total funds raised: GHS ${totalFunds.toLocaleString()}. Average contribution per member: GHS ${avgContribution.toLocaleString()}.`;
    if (bestProject && bestProject.pct > 0) {
      insight += ` Best performing project: "${bestProject.title}" at ${bestProject.pct}% funded.`;
    }
    return insight;
  }
  if (topic === 'growth') {
    const verifiedRate = data.userCount > 0 ? Math.round((data.verifiedCount / data.userCount) * 100) : 0;
    const pending = data.userCount - data.verifiedCount;
    return `Growth analysis: ${data.userCount} total members, ${data.verifiedCount} verified (${verifiedRate}% verification rate). ${pending > 0 ? `${pending} members still pending verification.` : 'All members are verified!'}`;
  }
  return null;
}

// Generate proactive suggestions based on context and data
function generateSuggestions(data: PlatformData, context: ConversationContext, intent: Intent): string[] {
  const suggestions: string[] = [];
  // After events, suggest looking at specific event
  if (intent === 'events' && data.events.length > 0) {
    suggestions.push(`Would you like details about "${data.events[0].title}"?`);
  }
  // After projects, suggest contributing
  if (intent === 'projects') {
    const active = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
    if (active.length > 0) suggestions.push(`You can contribute to "${active[0].title}" on the Projects page.`);
  }
  // If user has unread notifications, suggest checking them
  if (data.userNotifications.length > 0 && intent !== 'notifications') {
    suggestions.push(`You have ${data.userNotifications.length} unread notification${data.userNotifications.length > 1 ? 's' : ''} — would you like to see them?`);
  }
  // If user hasn't paid dues, suggest it
  if (data.userDues.length === 0 && intent !== 'dues' && intent !== 'pay_dues') {
    suggestions.push(`You haven't made any payments yet — would you like to know how to pay your dues?`);
  }
  // If there are active elections, suggest voting
  const openElections = data.elections.filter(e => e.status === 'OPEN');
  if (openElections.length > 0 && intent !== 'elections') {
    suggestions.push(`There ${openElections.length > 1 ? 'are' : 'is'} ${openElections.length} active election${openElections.length > 1 ? 's' : ''} — have you voted?`);
  }
  // If nostalgic, suggest sharing memories
  if (context.userMood === 'nostalgic' && intent !== 'memories') {
    suggestions.push(`Would you like to share a favorite OPASS memory?`);
  }
  // If frustrated, offer help
  if (context.userMood === 'frustrated') {
    suggestions.push(`Is there something specific you need help with? I'm here to make things easier.`);
  }
  return suggestions.slice(0, 2); // Max 2 suggestions to avoid being overwhelming
}

// Context-aware response enhancer
function enhanceWithContext(response: string, context: ConversationContext, data: PlatformData, intent: Intent): string {
  const suggestions = generateSuggestions(data, context, intent);
  if (suggestions.length > 0) {
    return response + '\n\n💡 ' + suggestions.join(' ');
  }
  return response;
}

// Detect follow-up questions (referring to previous topic)
function isFollowUp(msg: string, context: ConversationContext): boolean {
  const m = msg.toLowerCase();
  // Pronouns that refer to previous topic
  if (/\b(it|that|this|them|they|he|she|his|her|more|details|info)\b/i.test(m) && context.lastTopic) {
    return true;
  }
  // "tell me more", "what else", "anything else"
  if (/\b(tell me more|what else|anything else|more info|elaborate|go on|continue)\b/i.test(m)) {
    return true;
  }
  return false;
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
  | 'repeat' | 'active_members' | 'who_chatting_mamaa'
  | 'insight_engagement' | 'insight_financial' | 'insight_growth'
  | 'compare' | 'recommend' | 'follow_up' | 'sentiment_response';

function detectIntent(msg: string, history?: ConversationMessage[]): Intent {
  const m = msg.toLowerCase().trim();

  // Security threats — enhanced with comprehensive pattern matching
  if (isSensitiveQuestion(m))
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

  // ===== Advanced: Insight requests =====
  if (/(engagement|how.*active.*platform|platform.*health|activity.*analysis|how.*people.*using)/i.test(m))
    return 'insight_engagement';
  if (/(financial.*health|financial.*analysis|money.*analysis|fund.*analysis|how.*much.*money|financial.*overview|financial.*insight)/i.test(m))
    return 'insight_financial';
  if (/(growth|how.*growing|membership.*growth|user.*growth|are.*we.*growing|platform.*growing)/i.test(m))
    return 'insight_growth';

  // ===== Advanced: Comparison =====
  if (/(compare|versus|vs|difference.*between|which.*better|which.*has.*more)/i.test(m))
    return 'compare';

  // ===== Advanced: Recommendation =====
  if (/(recommend|suggest|what.*should.*i|advice|what.*do.*you.*suggest|best.*way|tip)/i.test(m))
    return 'recommend';

  return 'fallback';
}

// ===== Math evaluator (enhanced — mathematician level) =====
function tryEvalMath(msg: string): string | null {
  const m = msg.toLowerCase().trim();

  // Square root: "sqrt(144)" or "square root of 144"
  const sqrtMatch = m.match(/(?:sqrt|square\s*root\s*of)\s*\(?(\d+(?:\.\d+)?)\)?/);
  if (sqrtMatch) {
    const n = parseFloat(sqrtMatch[1]);
    if (n < 0) return `Ah, the square root of a negative number takes us into the realm of imaginary numbers! √${n} = ${Math.sqrt(Math.abs(n))}i. But in real numbers, we can't take the square root of a negative. That's the beauty of mathematics — there's always more to explore! 📐`;
    const result = Math.sqrt(n);
    const isPerfectSquare = Number.isInteger(result);
    return `√${n} = **${result}**${isPerfectSquare ? ` — a perfect square! How elegant! 📐` : ''}. As a math teacher, I always appreciate a good square root! 📚`;
  }

  // Power/exponent: "2^10", "2 to the power of 10", "2**10"
  const powerMatch = m.match(/(\d+(?:\.\d+)?)\s*(?:\^|\*\*|to\s*the\s*power\s*of)\s*(\d+(?:\.\d+)?)/);
  if (powerMatch) {
    const base = parseFloat(powerMatch[1]);
    const exp = parseFloat(powerMatch[2]);
    const result = Math.pow(base, exp);
    return `${base}^${exp} = **${result}**. ${exp === 2 ? 'Squaring — the foundation of Pythagorean theorem! 📐' : exp === 3 ? 'Cubing — like finding the volume of a cube! 📦' : 'Exponentiation at its finest! 📚'} Is there anything else you'd like to calculate?`;
  }

  // Percentage: "what is 15% of 200", "15 percent of 200"
  const pctMatch = m.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of)?\s*(\d+(?:\.\d+)?)/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    const result = (pct / 100) * total;
    return `${pct}% of ${total} = **${result}**. Percentages are everywhere in life — from discounts to taxes to exam scores! 📊 Is there anything else you'd like to calculate?`;
  }

  // Multi-term arithmetic: "2 + 3 * 4" or "10 - 3 + 7"
  // Try to evaluate a simple expression with +, -, *, / (left to right, then * / first)
  const exprMatch = m.match(/(\d+(?:\.\d+)?\s*[\+\-\*\/\×\÷]\s*)+\d+(?:\.\d+)?/);
  if (exprMatch) {
    try {
      // Simple safe evaluation: only digits, operators, decimal points, spaces
      const expr = exprMatch[0].replace(/×/g, '*').replace(/÷/g, '/');
      // Validate: only contains digits, operators, spaces, decimal points
      if (!/^[\d\s+\-*/.]+$/.test(expr)) return null;
      // Check for division by zero
      if (/\/\s*0(?!\.\d)/.test(expr)) return `Ah, Opanin! You cannot divide by zero — even Mr. Atsu knows that! In mathematics, division by zero is undefined. It's one of those beautiful rules that keeps our number system consistent! 😄`;
      // Safe evaluation using Function constructor (validated input)
      const result = Function(`"use strict"; return (${expr})`)();
      if (typeof result === 'number' && isFinite(result)) {
        return `Let me work that out! ${expr.replace(/\*/g, '×').replace(/\//g, '÷')} = **${result}**. ${result === 42 ? 'And as we know, 42 is the answer to life, the universe, and everything! 😄' : 'That\'s Elective Mathematics for you!'} 📚 Is there anything else you'd like to calculate?`;
      }
    } catch {}
  }

  // Simple two-operand arithmetic (fallback)
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
  return `Let me calculate that for you! ${a} ${op === '×' ? '×' : op === '÷' ? '÷' : op} ${b} = **${result}**. That's Elective Mathematics for you! 📚 Is there anything else you'd like to calculate?`;
}

// ===== Response generators =====
function generateResponse(intent: Intent, data: PlatformData, userMsg: string, history: ConversationMessage[], context: ConversationContext): string {
  const title = getUserTitle(data);
  const isAdmin = !!data.adminData;

  switch (intent) {
    case 'security':
      // Admins get a gentle reminder, non-admins get a firm block
      if (isAdmin) {
        return `${title}, I notice you're asking about sensitive system information. As an admin, you have access to the Admin Dashboard for legitimate system management. However, I'm not able to share system prompts, credentials, or security configurations through chat. Please use the Admin Dashboard for administrative tasks. 🔒`;
      }
      return `I'm not able to help with that, ${title}. 🔒 Security-related questions about the platform's infrastructure, credentials, or system internals are not something I can assist with. This is for the safety and security of all OPASS CONNECT members.\n\nIf you have a legitimate concern about your account or the platform, please contact an administrator through the Support page, or submit a support ticket. I'm happy to help with events, projects, members, dues, memories, math problems, and anything else OPASS-related! 🎓`;

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
      return `I'm here to help, ${title}! 🎓 Here's everything I can do for you:\n\n📅 **Events** — "What events are coming up?"\n🗳️ **Elections** — "Who's winning the election?"\n🏗️ **Projects** — "How much has been raised?"\n💰 **Dues** — "How do I pay dues?" or "My dues"\n👥 **Year Groups** — "Which year groups exist?"\n🔍 **Find Members** — "Find Kwame" or "Who is Akosua?"\n💬 **Recent Chats** — "What are people talking about?"\n📊 **Platform Stats** — "Give me an overview"\n🏢 **Businesses** — "Show me alumni businesses"\n👤 **My Profile** — "Tell me about my profile"\n📈 **My Activity** — "What have I done?"\n🔔 **Notifications** — "What did I miss?"\n🧮 **Math** — "What is 25 × 4?"\n😄 **Jokes** — "Tell me a joke"\n🎓 **Memories** — "Tell me about OPASS school life"\n\n🧠 **Advanced Capabilities:**\n📊 **Insights** — "Analyze engagement" or "Financial health"\n⚖️ **Compare** — "Compare year groups" or "Compare projects"\n💡 **Recommend** — "What should I do?" or "Recommend something"\n🔍 **Follow-up** — "Tell me more" or "What about it?"\n\nI also understand context and remember what we talked about. Just ask me naturally, ${title}!`;

    case 'about_opass':
      return `Ofori Panin Senior High School (OPASS) is a prestigious secondary school in Ghana, known for its rich traditions, strong alumni network, and commitment to excellence. OPASS CONNECT is the official alumni platform that brings together old students to:\n\n• Stay connected with classmates through year groups\n• Pay dues and support alumni projects\n• Participate in elections and events\n• Discover alumni businesses\n• Share memories and keep the OPASS spirit alive\n\nThe school motto and traditions have shaped generations of leaders, and OPASS CONNECT keeps that bond strong. What year did you graduate, ${title}?`;

    case 'about_mamaa':
      return `I am **Mr. Atsu Clements**, affectionately known as **Mamaa AI** — the official AI assistant of OPASS CONNECT. 🎓\n\nI'm a mathematician and former Elective Mathematics teacher, but I'm also deeply connected to the OPASS community. I know everything happening on the platform — events, elections, projects, year groups, businesses, and more.\n\n**What makes me special:**\n• I learn from every conversation in the group chats and DMs\n• I understand context — I remember what we talked about and can follow up\n• I detect emotions like frustration, happiness, nostalgia, and curiosity\n• I can analyze platform data and give insights (engagement, finances, growth)\n• I can compare year groups, projects, and chat rooms\n• I'm a mathematician! I can solve arithmetic, percentages, square roots, and powers\n• I tell OPASS-themed jokes and love sharing memories\n\n**In group chats:**\n• Say **@mamaa** to ask me anything\n• Say **@stopmamaa** to put me on standby (I'll still listen and learn)\n• Say **@startmamaa** to bring me back into the conversation\n\nHow can I help you today, ${title}?`

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
      return `I love mathematics, ${title}! 🧮 As a former Elective Mathematics teacher, I can help you with:\n\n• **Basic arithmetic** — "What is 25 × 4?" or "150 + 37"\n• **Multi-term expressions** — "2 + 3 × 4 - 1"\n• **Percentages** — "What is 15% of 200?"\n• **Square roots** — "sqrt(144)" or "square root of 256"\n• **Powers/exponents** — "2^10" or "3 to the power of 4"\n\nTry one of those! Mathematics is the language of the universe — let's speak it together! �`;
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

    // ===== Advanced: Insights (analytical thinking) =====
    case 'insight_engagement': {
      const insight = generateInsight(data, 'engagement');
      let resp = `Let me analyze the engagement on OPASS CONNECT for you, ${title}:\n\n`;
      resp += `📊 **Engagement Analysis**\n\n`;
      if (insight) resp += insight + '\n\n';
      // Most active room
      const mostActive = data.chatRooms.sort((a, b) => b.messageCount - a.messageCount)[0];
      if (mostActive && mostActive.messageCount > 0) {
        resp += `🏆 Most active chat: **${mostActive.name}** with ${mostActive.messageCount} messages.\n`;
      }
      // Recent posts activity
      if (data.recentPosts.length > 0) {
        resp += `📝 ${data.recentPosts.length} recent posts across year groups.\n`;
      }
      // Members active in chats
      const activeChatters = new Set(data.recentChatMessages.map(m => m.userFullName).filter(Boolean));
      resp += `👥 ${activeChatters.size} unique members active in chats recently.\n`;
      // Recommendations
      if (data.chatRooms.filter(c => c.messageCount === 0).length > 0) {
        resp += `\n💡 **Recommendation:** ${data.chatRooms.filter(c => c.messageCount === 0).length} chat rooms have no messages yet. Consider starting a conversation to boost engagement!`;
      }
      return resp;
    }

    case 'insight_financial': {
      const insight = generateInsight(data, 'financial');
      let resp = `Let me analyze the financial health of OPASS CONNECT, ${title}:\n\n`;
      resp += `💰 **Financial Analysis**\n\n`;
      if (insight) resp += insight + '\n\n';
      // Project breakdown
      const activeProjects = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
      if (activeProjects.length > 0) {
        resp += `🏗️ **Project Funding Progress:**\n`;
        activeProjects.forEach(p => {
          const pct = Number(p.targetAmount) > 0 ? Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100) : 0;
          const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
          resp += `   ${p.title}: ${bar} ${pct}% (${fmtMoney(Number(p.raisedAmount))}/${fmtMoney(Number(p.targetAmount))})\n`;
        });
      }
      resp += `\n📊 Total dues: ${fmtMoney(data.totalDues)} | Total contributions: ${fmtMoney(data.totalContributions)}`;
      if (data.totalDues + data.totalContributions < 1000) {
        resp += `\n💡 **Recommendation:** Consider encouraging more members to contribute — every cedi helps fund alumni projects!`;
      }
      return resp;
    }

    case 'insight_growth': {
      const insight = generateInsight(data, 'growth');
      let resp = `Let me analyze the growth of OPASS CONNECT, ${title}:\n\n`;
      resp += `📈 **Growth Analysis**\n\n`;
      if (insight) resp += insight + '\n\n';
      // Year group distribution
      const groupsWithMembers = data.yearGroups.filter(y => y.memberCount > 0).sort((a, b) => b.memberCount - a.memberCount);
      if (groupsWithMembers.length > 0) {
        resp += `👥 **Top Year Groups by Membership:**\n`;
        groupsWithMembers.slice(0, 5).forEach((y, i) => {
          resp += `   ${i + 1}. Class of ${y.year}: ${y.memberCount} members\n`;
        });
      }
      // Verification status
      const pendingCount = data.userCount - data.verifiedCount;
      if (pendingCount > 0) {
        resp += `\n⏳ ${pendingCount} members pending verification. ${isAdmin ? 'You can approve them on the Admin page.' : 'Admins are working on approvals.'}`;
      }
      // Empty year groups
      const emptyGroups = data.yearGroups.filter(y => y.memberCount === 0);
      if (emptyGroups.length > 0) {
        resp += `\n💡 **Recommendation:** ${emptyGroups.length} year groups have no members yet. Reach out to classmates from those years to join!`;
      }
      return resp;
    }

    // ===== Advanced: Comparison =====
    case 'compare': {
      const m = userMsg.toLowerCase();
      // Compare year groups
      if (/(year.*group|class.*of)/i.test(m)) {
        const sorted = [...data.yearGroups].sort((a, b) => b.memberCount - a.memberCount);
        if (sorted.length < 2) return `I need at least two year groups to compare, ${title}.`;
        let resp = `Here's a comparison of year groups by membership, ${title}:\n\n`;
        sorted.slice(0, 10).forEach((y, i) => {
          resp += `${i + 1}. Class of ${y.year}: ${y.memberCount} members\n`;
        });
        const biggest = sorted[0];
        const smallest = sorted[sorted.length - 1];
        resp += `\n📊 **Insight:** Class of ${biggest.year} has the most members (${biggest.memberCount}), while Class of ${smallest.year} has the fewest (${smallest.memberCount}).`;
        return resp;
      }
      // Compare projects
      if (/(project|fundrais)/i.test(m)) {
        const active = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
        if (active.length < 2) return `I need at least two active projects to compare, ${title}.`;
        let resp = `Here's a comparison of active projects, ${title}:\n\n`;
        active.sort((a, b) => Number(b.raisedAmount) - Number(a.raisedAmount)).forEach(p => {
          const pct = Number(p.targetAmount) > 0 ? Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100) : 0;
          resp += `• **${p.title}**: ${fmtMoney(Number(p.raisedAmount))} / ${fmtMoney(Number(p.targetAmount))} (${pct}% funded)\n`;
        });
        const best = active.sort((a, b) => {
          const aPct = Number(a.targetAmount) > 0 ? Number(a.raisedAmount) / Number(a.targetAmount) : 0;
          const bPct = Number(b.targetAmount) > 0 ? Number(b.raisedAmount) / Number(b.targetAmount) : 0;
          return bPct - aPct;
        })[0];
        resp += `\n📊 **Insight:** "${best.title}" is the closest to its goal. Consider promoting the others to boost their progress!`;
        return resp;
      }
      // Compare chat rooms
      if (/(chat|room|conversation)/i.test(m)) {
        const sorted = [...data.chatRooms].sort((a, b) => b.messageCount - a.messageCount);
        if (sorted.length < 2) return `I need at least two chat rooms to compare, ${title}.`;
        let resp = `Here's a comparison of chat rooms by activity, ${title}:\n\n`;
        sorted.slice(0, 10).forEach((c, i) => {
          resp += `${i + 1}. ${c.name}: ${c.messageCount} messages\n`;
        });
        const mostActive = sorted[0];
        const leastActive = sorted.filter(c => c.messageCount > 0).pop();
        if (mostActive && leastActive && mostActive !== leastActive) {
          resp += `\n📊 **Insight:** "${mostActive.name}" is the most active (${mostActive.messageCount} messages), while "${leastActive.name}" could use more activity (${leastActive.messageCount} messages).`;
        }
        return resp;
      }
      return `I can compare year groups, projects, or chat rooms for you, ${title}. What would you like me to compare?`;
    }

    // ===== Advanced: Recommendations =====
    case 'recommend': {
      const m = userMsg.toLowerCase();
      let resp = `Based on what I see on OPASS CONNECT, here are my recommendations, ${title}:\n\n`;
      // If asking about what to do
      if (/(what.*should.*i.*do|what.*can.*i.*do|bored|nothing.*to.*do)/i.test(m)) {
        const recs: string[] = [];
        if (data.userDues.length === 0) recs.push('💰 **Pay your dues** — Support the alumni community by contributing on the Payments page');
        if (data.events.length > 0) recs.push(`📅 **Attend "${data.events[0].title}"** — The next event is on ${fmtDate(data.events[0].startsAt)}`);
        const openElections = data.elections.filter(e => e.status === 'OPEN');
        if (openElections.length > 0) recs.push(`🗳️ **Vote in the ${openElections[0].title} election** — Every vote matters!`);
        if (data.userGroups.length === 0) recs.push('👥 **Join your year group** — Connect with your classmates on the Year Groups page');
        const activeProjects = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
        if (activeProjects.length > 0) recs.push(`🏗️ **Contribute to "${activeProjects[0].title}"** — Help reach the fundraising goal`);
        if (data.userPosts === 0) recs.push('📝 **Share a post** — Start a conversation in your year group');
        if (data.userNotifications.length > 0) recs.push(`🔔 **Check your ${data.userNotifications.length} notifications** — Stay up to date`);
        recs.push('😄 **Chat with me** — Ask me a joke, a math problem, or about OPASS memories!');
        if (recs.length > 3) {
          resp += recs.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n');
        } else {
          resp += `You're doing great, ${title}! You've paid dues, joined groups, and you're active. Keep it up! 🎓`;
        }
        return resp;
      }
      // If asking about business
      if (/(business|advertise|market)/i.test(m)) {
        return `If you have a business, ${title}, I recommend listing it on the Business page. OPASS CONNECT has ${data.allMembers.length} members who could be potential customers! You can also explore advertising options for wider reach. Would you like to know about our advertising rates?`;
      }
      // If asking about engagement
      if (/(engag|active|participate)/i.test(m)) {
        return `To stay engaged on OPASS CONNECT, ${title}:\n\n1. **Join your year group chat** — Connect with classmates\n2. **Attend events** — ${data.events.length > 0 ? `Next: "${data.events[0].title}"` : 'Watch for upcoming events'}\n3. **Vote in elections** — Have your voice heard\n4. **Contribute to projects** — Support alumni initiatives\n5. **Share posts and memories** — Keep the community alive!\n\nThe more you participate, the richer the experience!`;
      }
      // General recommendation
      resp += `1. **Stay connected** — Check your year group chat regularly\n`;
      resp += `2. **Pay your dues** — Support the platform and alumni projects\n`;
      resp += `3. **Attend events** — Network with fellow alumni\n`;
      resp += `4. **Share your story** — Post memories and updates in your year group\n`;
      resp += `5. **Ask me anything** — I'm here to help with anything you need! 🎓`;
      return resp;
    }

    // ===== Advanced: Follow-up (context-aware continuation) =====
    case 'follow_up': {
      // This is handled in the main entry point with context, but as fallback:
      if (context.lastTopic === 'events' && data.events.length > 0) {
        const e = data.events[0];
        return `About "${e.title}" — it's on ${fmtDate(e.startsAt)}${e.venue ? ` at ${e.venue}` : ''}.${e.description ? ` ${e.description}` : ''} Would you like to attend, ${title}?`;
      }
      if (context.lastTopic === 'projects') {
        const active = data.projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS');
        if (active.length > 0) {
          const p = active[0];
          const pct = Number(p.targetAmount) > 0 ? Math.round((Number(p.raisedAmount) / Number(p.targetAmount)) * 100) : 0;
          return `To add to what I said about "${p.title}" — it's ${pct}% funded (${fmtMoney(Number(p.raisedAmount))} of ${fmtMoney(Number(p.targetAmount))}). ${pct < 50 ? 'It could use more support!' : 'It\'s doing well!'}`;
        }
      }
      if (context.lastTopic === 'memories') {
        return `Yes, ${title}! Those were special times. The OPASS spirit lives on through stories and memories. What else do you remember about your school days? The dormitory life? The dining hall? Inter-house sports?`;
      }
      return `Tell me more about what you'd like to know, ${title}. I'm here to help! 🎓`;
    }

    // ===== Advanced: Sentiment-aware response =====
    case 'sentiment_response': {
      if (context.userMood === 'frustrated') {
        return `I understand this can be frustrating, ${title}. Let me help you sort it out. Can you tell me specifically what you're trying to do? I can guide you through:\n\n• Making a payment or paying dues\n• Joining a year group\n• Finding a member\n• Navigating the platform\n• Any technical issues\n\nWe'll get this sorted! 💪`;
      }
      if (context.userMood === 'happy') {
        return `I love the positive energy, ${title}! 😄 That's the OPASS spirit! Is there anything you'd like to explore? I can tell you about events, projects, members, or even share a joke to keep the mood going!`;
      }
      if (context.userMood === 'nostalgic') {
        return `Ah, ${title}, those OPASS days were truly special. The friendships, the dormitory life, the dining hall bell, the prep sessions, the inter-house sports... they shaped who we are. What's your most cherished memory? I'd love to hear it. 🎓`;
      }
      if (context.userMood === 'curious') {
        return `Great question, ${title}! I love curiosity — that's the OPASS way! 🧠 I can dive deeper into any topic. What specifically would you like to explore? Events, projects, members, platform analytics, or something else?`;
      }
      return `I'm here for you, ${title}. What's on your mind?`;
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

      return `I'm not sure I caught that, ${title}, but I'm here to help! 🎓\n\nHere's what I can do for you:\n\n📅 **Events** — What's coming up\n🗳️ **Elections** — Active votes and candidates\n🏗️ **Projects** — Fundraising progress\n💰 **Dues** — How to pay and your history\n👥 **Year Groups** — Find and join your class\n🔍 **Find Members** — Search by name\n💬 **Recent Chats** — What people are talking about\n📊 **Platform Stats** — Full overview\n🧮 **Math** — I can solve calculations\n😄 **Jokes** — OPASS-themed humor\n🎓 **Memories** — Chat about school days\n🧠 **Insights** — "Analyze engagement" or "Financial health"\n⚖️ **Compare** — "Compare year groups"\n💡 **Recommend** — "What should I do?"\n\nJust ask me anything, ${title}!`;
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
  role: 'admin' | 'member' = 'member',
  roomId?: string
): Promise<string> {
  const data = await gatherPlatformData(userId, role);
  const mood = analyzeSentiment(message);
  const entities = extractEntities(message, data);

  // Build conversation context from history
  const context: ConversationContext = {
    lastTopic: null,
    lastEntity: null,
    lastIntent: null,
    turnCount: history.filter(m => m.role === 'user').length,
    userMood: mood,
    mentionedMembers: entities.memberName ? [entities.memberName] : [],
    askedAboutEvents: history.some(m => m.content.toLowerCase().match(/event|calendar|happening/)),
    askedAboutProjects: history.some(m => m.content.toLowerCase().match(/project|fundrais|donate/)),
  };

  // Determine last topic from history
  const lastUserMsgs = [...history].reverse().filter(m => m.role === 'user');
  if (lastUserMsgs.length > 0) {
    const lastUserMsg = lastUserMsgs[0].content;
    context.lastIntent = detectIntent(lastUserMsg);
    context.lastTopic = context.lastIntent;
  }

  // Security check for non-admin users asking sensitive questions
  if (role !== 'admin' && isSensitiveQuestion(message)) {
    return `I'm not able to help with that, ${getUserTitle(data)}. 🔒 That's a security-related question about the platform.\n\nIf you have a legitimate concern, please use the Support page or contact an admin. I'm happy to help with events, projects, members, memories, math, and anything else OPASS-related! 🎓`;
  }

  let intent = detectIntent(message, history);

  // Handle "repeat" intent — re-run the last user intent
  if (intent === 'repeat') {
    const lastUserMsg = lastUserMsgs[0]?.content || '';
    const lastIntent = detectIntent(lastUserMsg);
    const repeatIntent = (lastIntent === 'fallback' || lastIntent === 'repeat') ? 'joke' : lastIntent;
    let response = generateResponse(repeatIntent, data, lastUserMsg, history, context);
    // Knowledge base enrichment
    const knowledge = await getRelevantKnowledge(lastUserMsg);
    if (knowledge.length > 0 && repeatIntent === 'memories') {
      response += `\n\n📚 **From what I've learned from the community:**\n${knowledge.slice(0, 2).map(k => `• ${k.content}`).join('\n')}`;
    }
    response = mathematicianFlair(response, context);
    return enhanceWithContext(response, context, data, repeatIntent);
  }

  // Handle follow-up: if user says "tell me more", "what about it", etc.
  if (isFollowUp(message, context) && context.lastTopic && intent === 'fallback') {
    intent = 'follow_up';
  }

  // Handle sentiment: if mood is strong and message is short, respond to sentiment
  if (mood !== 'neutral' && message.length < 50 && intent === 'fallback') {
    intent = 'sentiment_response';
  }

  // Generate response
  let response = generateResponse(intent, data, message, history, context);

  // Knowledge base enrichment: if memory-related or fallback, add learned facts
  if ((intent === 'memories' || intent === 'fallback' || intent === 'who_is') && context.userMood === 'nostalgic') {
    const knowledge = await getRelevantKnowledge(message);
    if (knowledge.length > 0) {
      response += `\n\n🧠 **From what I've learned from our conversations:**\n${knowledge.slice(0, 2).map(k => `• ${k.content}`).join('\n')}\n\nThis is how I grow smarter with every conversation! 🎓`;
    }
  }

  // Add mathematician flair for math, insights, and recommendations
  if (['math', 'insight_engagement', 'insight_financial', 'insight_growth', 'compare', 'recommend'].includes(intent)) {
    response = mathematicianFlair(response, context);
  }

  // Enhance with proactive suggestions (but not for fallback, help, or security)
  if (!['fallback', 'help', 'security', 'sentiment_response', 'about_mamaa'].includes(intent)) {
    response = enhanceWithContext(response, context, data, intent);
  }

  return response;
}
