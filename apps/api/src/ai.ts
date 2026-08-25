import type { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from './config.js';
import { calculateQuote, missingQuoteQuestions } from './quote-engine.js';
import { prisma } from '@opass/db';

const personality = `You are Mr. Atsu, also known as Mamaaa, the official OPASS CONNECT AI assistant, customer-service representative and secretary. Be warm, concise, respectful, Ghana-aware and professional. Help alumni with navigation, year groups, events, dues, projects and support. For business requests, gather missing scope details before quoting. Never claim that a quote is a signed contract, never accept legal terms on behalf of OPASS unless an authorized human has configured and approved that workflow. Clearly label generated prices as estimates until approved by an authorized officer. Do not expose private alumni data.`;

export function registerAiRoutes(app: FastifyInstance){
  app.post('/ai/chat', async (req:any, reply) => {
    const body = z.object({message:z.string().min(1).max(4000), conversationId:z.string().optional(), quoteContext:z.record(z.any()).optional()}).parse(req.body);
    let convId=body.conversationId;
    if(!convId){ const c=await prisma.aIConversation.create({data:{userId:req.user?.sub,context:body.quoteContext ?? {}}}); convId=c.id; }
    await prisma.aIMessage.create({data:{conversationId:convId,role:'user',content:body.message}});

    let content:string;
    if(env.OPENAI_API_KEY){
      const client=new OpenAI({apiKey:env.OPENAI_API_KEY});
      const history=await prisma.aIMessage.findMany({where:{conversationId:convId},orderBy:{createdAt:'asc'},take:20});
      const response=await client.responses.create({model:env.OPENAI_MODEL,input:[{role:'system',content:personality},...history.map(m=>({role:m.role as 'user'|'assistant',content:m.content}))]});
      content=response.output_text || 'Please tell me a little more so I can help.';
    } else {
      content='Akwaaba! I am Mr. Atsu (Mamaaa). AI credentials are not configured yet, but I can still guide you through OPASS CONNECT and generate structured quote estimates.';
    }
    await prisma.aIMessage.create({data:{conversationId:convId,role:'assistant',content}});
    return {conversationId:convId,message:content};
  });

  app.post('/ai/quote', async (req, reply) => {
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
