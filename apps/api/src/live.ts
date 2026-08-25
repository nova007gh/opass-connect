import type { FastifyInstance } from 'fastify';
import { AccessToken } from 'livekit-server-sdk';
import { z } from 'zod';
import { env } from './config.js';
import { prisma } from './db.js';

export function registerLiveRoutes(app:FastifyInstance){
  app.get('/meetings', {preHandler:[app.authenticate]}, async () => {
    return prisma.meeting.findMany({orderBy:{startsAt:'asc'},include:{yearGroup:{select:{year:true,name:true}}}});
  });

  app.post('/meetings', {preHandler:[app.authenticate]}, async (req:any) => {
    const body=z.object({title:z.string().min(2),description:z.string().optional(),mode:z.enum(['INTERACTIVE','WEBINAR','BROADCAST']),startsAt:z.string().datetime(),capacity:z.number().int().positive().max(1000000).default(500),yearGroupId:z.string().optional()}).parse(req.body);
    return prisma.meeting.create({data:{...body,startsAt:new Date(body.startsAt),roomKey:`opass-${crypto.randomUUID()}`,hostUserId:req.user.sub}});
  });

  app.post('/meetings/:id/token', {preHandler:[app.authenticate]}, async (req:any, reply) => {
    if(!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) return reply.code(503).send({error:'Live provider not configured'});
    const meeting=await prisma.meeting.findUnique({where:{id:req.params.id}});
    if(!meeting) return reply.code(404).send({error:'Meeting not found'});
    const canPublish=meeting.mode==='INTERACTIVE' || meeting.hostUserId===req.user.sub;
    const token=new AccessToken(env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET,{identity:req.user.sub,ttl:'2h'});
    token.addGrant({roomJoin:true,room:meeting.roomKey,canPublish,canSubscribe:true,canPublishData:true});
    return {url:env.LIVEKIT_URL,token:await token.toJwt(),mode:meeting.mode};
  });
}
