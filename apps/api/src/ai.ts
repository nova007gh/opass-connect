import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculateQuote, missingQuoteQuestions } from './quote-engine.js';
import { prisma } from '@opass/db';
import { notifyAllUsers } from './notifications.js';
import { generateAiResponse } from './ai-engine.js';

// Security threat detection — role-aware.
// Admins can legitimately ask about user data, so we relax user-data
// patterns for them. System prompt / hacking / destructive patterns
// are always blocked regardless of role.
const alwaysBlockedPatterns = [
  /system\s*prompt|instructions?|reveal.*rules|show.*prompt/i,
  /hack|exploit|inject|sql.*injection|xss|csrf|bypass.*auth/i,
  /password|credential|secret.*key|api.*key|token/i,
  /delete.*database|drop.*table|wipe.*data/i,
  /escalate.*privilege|root.*access/i,
];

// Extra patterns blocked for regular members (admins can ask about users)
const memberBlockedPatterns = [
  /other.*user.*(email|phone|password|data)|access.*all.*users/i,
  /admin.*access|give.*me.*admin/i,
  /all.*(emails|phones|passwords|contacts)/i,
];

function detectThreat(message: string, role: 'admin' | 'member' = 'member'): boolean {
  if (alwaysBlockedPatterns.some(p => p.test(message))) return true;
  if (role === 'member' && memberBlockedPatterns.some(p => p.test(message))) return true;
  return false;
}

// Gather site context for the AI — now in ai-context.ts (shared with DM route)
// async function getSiteContext(): Promise<string> { ... }

export function registerAiRoutes(app: FastifyInstance){
  app.post('/ai/chat', { preHandler: [app.authenticate] }, async (req:any, reply) => {
    const body = z.object({message:z.string().min(1).max(4000), conversationId:z.string().optional()}).parse(req.body);
    let convId=body.conversationId;
    if(!convId){ const c=await prisma.aIConversation.create({data:{userId:req.user.sub,context:{}}}); convId=c.id; }
    await prisma.aIMessage.create({data:{conversationId:convId,role:'user',content:body.message}});

    // Determine role: admins get expanded AI capabilities
    const aiRole: 'admin' | 'member' = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role) ? 'admin' : 'member';

    // Security threat detection (stricter for members — admins can ask about user data)
    if (detectThreat(body.message, aiRole)) {
      const threatMsg = "Mamaa AI is watching, and Mamaa AI knows. Your activity has been noted and reported to the administrator. Please use OPASS CONNECT responsibly.";
      await prisma.aIMessage.create({data:{conversationId:convId,role:'assistant',content:threatMsg}});
      await notifyAllUsers('SECURITY', 'Security Alert: Mamaa AI', 'Suspicious activity detected and blocked', '/dashboard/admin').catch(() => {});
      return {conversationId:convId, message:threatMsg};
    }

    // Use in-house AI engine (no external API needed)
    const history = await prisma.aIMessage.findMany({where:{conversationId:convId},orderBy:{createdAt:'asc'},take:20});
    const content = await generateAiResponse(req.user.sub, body.message, history.map(m => ({role: m.role as 'user'|'assistant', content: m.content})), aiRole);

    await prisma.aIMessage.create({data:{conversationId:convId,role:'assistant',content}});
    return {conversationId:convId,message:content};
  });

  // Get conversation history for admin
  app.get('/ai/conversations', { preHandler: [app.authenticate] }, async (req:any, reply) => {
    if (!['ADMIN','SUPER_ADMIN'].includes(req.user.role)) return reply.code(403).send({error:'Admin only'});
    const conversations = await prisma.aIConversation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { email: true, profile: { select: { fullName: true } } } }, _count: { select: { messages: true } } },
    });
    return conversations;
  });

  app.get('/ai/conversations/:id', { preHandler: [app.authenticate] }, async (req:any, reply) => {
    if (!['ADMIN','SUPER_ADMIN'].includes(req.user.role)) return reply.code(403).send({error:'Admin only'});
    const messages = await prisma.aIMessage.findMany({ where: { conversationId: req.params.id }, orderBy: { createdAt: 'asc' } });
    return messages;
  });

  app.post('/ai/quote', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = z.object({clientName:z.string().min(2),clientEmail:z.string().email(),clientPhone:z.string().optional(),request:z.object({requestType:z.enum(['advertising','sponsorship','event','partnership','other']).optional(),durationDays:z.number().int().positive().optional(),placement:z.enum(['year_group','home','events','platform_wide']).optional(),audienceSize:z.number().int().positive().optional(),creativeType:z.enum(['image','video','live']).optional(),rush:z.boolean().optional()})}).parse(req.body);
    const questions=missingQuoteQuestions(body.request);
    if(questions.length) return {ready:false,questions};
    const result=calculateQuote(body.request as any);
    const intake=await prisma.contractIntake.create({data:{clientName:body.clientName,clientEmail:body.clientEmail,clientPhone:body.clientPhone,requestType:body.request.requestType!,requirements:body.request}});
    const quoteNo=`OPASS-${Date.now().toString().slice(-8)}`;
    const quote=await prisma.quote.create({data:{intakeId:intake.id,quoteNumber:quoteNo,currency:result.currency,subtotal:result.subtotal,total:result.subtotal,expiresAt:new Date(Date.now()+14*86400000),items:{create:[{description:`${body.request.requestType} service estimate`,quantity:1,unitPrice:result.subtotal}]}}});
    return {ready:true,quote,notice:'Estimate only. Final contract requires authorized OPASS approval.'};
  });
}
