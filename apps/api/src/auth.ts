import type { FastifyInstance, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@opass/db';

export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const body = z.object({
      email: z.string().email(), phone: z.string().optional(), password: z.string().min(10),
      fullName: z.string().min(2), graduationYear: z.number().int().min(1955).max(new Date().getFullYear()),
      house: z.string().optional(), positionHeld: z.string().optional(), country: z.string().optional(), city: z.string().optional(),
      inviteToken: z.string().optional(),
    }).parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({data:{email:body.email.toLowerCase(), phone:body.phone, passwordHash, profile:{create:{fullName:body.fullName, graduationYear:body.graduationYear, house:body.house, positionHeld:body.positionHeld, country:body.country, city:body.city}}}, include:{profile:true}});
    if (body.inviteToken) {
      const invite = await prisma.yearGroupInvite.findUnique({ where: { token: body.inviteToken }, include: { yearGroup: true, invitedBy: true } });
      if (invite && !invite.invitedUserId) {
        const inviterIsAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(invite.invitedBy.role);
        await prisma.yearGroupInvite.update({ where: { id: invite.id }, data: { invitedUserId: user.id, status: inviterIsAdmin ? 'APPROVED' : 'PENDING' } });
        if (inviterIsAdmin) {
          await prisma.yearGroupMembership.upsert({ where: { userId_yearGroupId: { userId: user.id, yearGroupId: invite.yearGroupId } }, update: {}, create: { userId: user.id, yearGroupId: invite.yearGroupId } }).catch(() => {});
        } else {
          const { notifyAdmins } = await import('./notifications.js');
          notifyAdmins('SYSTEM', 'Year group invite needs approval', `${body.fullName} joined via invite link and needs approval to join ${invite.yearGroup.name}.`, '/dashboard/admin').catch(() => {});
        }
      }
    }
    const token = app.jwt.sign({sub:user.id, role:user.role}, {expiresIn:'7d'});
    return reply.code(201).send({token,user:safeUser(user)});
  });

  app.post('/auth/login', async (req, reply) => {
    const body = z.object({email:z.string().email(), password:z.string()}).parse(req.body);
    const user = await prisma.user.findUnique({where:{email:body.email.toLowerCase()}, include:{profile:true}});
    if (!user || !(await bcrypt.compare(body.password,user.passwordHash))) return reply.code(401).send({error:'Invalid credentials'});
    const token = app.jwt.sign({sub:user.id, role:user.role}, {expiresIn:'7d'});
    return {token,user:safeUser(user)};
  });

  app.get('/auth/me', {preHandler:[app.authenticate]}, async (req:any) => {
    return prisma.user.findUnique({where:{id:req.user.sub}, select:{id:true,email:true,phone:true,role:true,verification:true,profile:true,memberships:{include:{yearGroup:true}}}});
  });

  app.post('/auth/change-password', {preHandler:[app.authenticate]}, async (req:any, reply) => {
    const body = z.object({currentPassword:z.string(), newPassword:z.string().min(10)}).parse(req.body);
    const user = await prisma.user.findUnique({where:{id:req.user.sub}});
    if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) return reply.code(401).send({error:'Current password is incorrect'});
    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({where:{id:user.id}, data:{passwordHash}});
    return {ok:true};
  });
}

export function safeUser(user:any){ const {passwordHash,...safe}=user; return safe; }
export function requireRoles(...roles:string[]){ return async (req:any, reply:any) => { if(!roles.includes(req.user.role)) return reply.code(403).send({error:'Forbidden'}); }; }

declare module 'fastify' { interface FastifyInstance { authenticate: (request: FastifyRequest, reply:any)=>Promise<void> } }
