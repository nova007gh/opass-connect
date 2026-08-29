import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@opass/db';
import { requireRoles } from './auth.js';
import { notifyUser, notifyAllUsers, notifyAdmins } from './notifications.js';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../public/uploads');
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5_000_000;

// Cloudinary config check
const CLOUDINARY_CONFIGURED = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

async function uploadToCloudinary(buffer: Buffer, publicId: string, folder: string, width: number, height: number): Promise<string> {
  const cloudinary = await import('cloudinary');
  const cloud = cloudinary.v2;
  cloud.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    const stream = cloud.uploader.upload_stream(
      { public_id: publicId, folder, transformation: [{ width, height, crop: 'fill', gravity: 'face' }] },
      (err, result) => { if (err) reject(err); else resolve(result!.secure_url); }
    );
    stream.end(buffer);
  });
}

async function processAndStoreImage(fileBuffer: Buffer, mimetype: string, id: string, folder: string, width: number, height: number): Promise<string> {
  let processed: Buffer;
  try {
    const sharp = (await import('sharp')).default;
    processed = await sharp(fileBuffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    if (fileBuffer.length > 1_000_000) throw new Error('Image too large. Please use an image under 1MB.');
    processed = fileBuffer;
  }

  if (CLOUDINARY_CONFIGURED) {
    try {
      const publicId = `${folder}-${id}-${randomUUID()}`;
      return await uploadToCloudinary(processed, publicId, `opass-${folder}`, width, height);
    } catch (e) {
      console.error('Cloudinary upload failed, falling back to base64:', e);
    }
  }

  const base64 = processed.toString('base64');
  const mime = processed === fileBuffer ? mimetype : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

async function processAndStoreAvatar(fileBuffer: Buffer, mimetype: string, userId: string): Promise<string> {
  return processAndStoreImage(fileBuffer, mimetype, userId, 'avatars', 400, 400);
}

async function readFileFromRequest(req: any): Promise<{ buffer: Buffer; mimetype: string }> {
  const file = await req.file();
  if (!file) throw new Error('No file uploaded');
  if (!ALLOWED_MIME.has(file.mimetype)) throw new Error('Only JPEG, PNG, WebP or GIF images are allowed');
  const chunks: Buffer[] = [];
  for await (const chunk of file.file) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); }
  const buffer = Buffer.concat(chunks);
  if (buffer.length > MAX_BYTES) throw new Error('Image must be under 5MB');
  return { buffer, mimetype: file.mimetype };
}

export function registerCoreRoutes(app:FastifyInstance){
  app.get('/year-groups',async()=>prisma.yearGroup.findMany({orderBy:{year:'desc'},include:{_count:{select:{memberships:true}}}}));
  app.post('/year-groups',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({year:z.number().int().min(1960).max(2030),name:z.string().min(2),description:z.string().optional()}).parse(req.body);const existing=await prisma.yearGroup.findFirst({where:{year:b.year}});if(existing)return{error:'A year group for this year already exists',existing};return prisma.yearGroup.create({data:b});});
  app.post('/year-groups/:id/image',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'yeargroups',200,200);await prisma.yearGroup.update({where:{id:req.params.id},data:{imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.post('/year-groups/:id/join',{preHandler:[app.authenticate]},async(req:any)=>prisma.yearGroupMembership.upsert({where:{userId_yearGroupId:{userId:req.user.sub,yearGroupId:req.params.id}},update:{},create:{userId:req.user.sub,yearGroupId:req.params.id}}));

  app.get('/alumni',{preHandler:[app.authenticate]},async(req:any)=>{const q=z.object({year:z.coerce.number().optional(),house:z.string().optional(),search:z.string().optional()}).parse(req.query);return prisma.alumniProfile.findMany({where:{searchable:true,graduationYear:q.year,house:q.house,fullName:q.search?{contains:q.search,mode:'insensitive'}:undefined},take:100,select:{fullName:true,graduationYear:true,house:true,country:true,city:true,profession:true,avatarUrl:true,userId:true}})});
  app.patch('/profile',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({fullName:z.string().min(2).optional(),graduationYear:z.number().int().min(1960).max(2030).optional(),house:z.string().optional(),className:z.string().optional(),positionHeld:z.string().optional(),country:z.string().optional(),city:z.string().optional(),profession:z.string().optional(),bio:z.string().max(1000).optional(),avatarUrl:z.union([z.string().url(),z.string().regex(/^data:image\//)]).optional(),searchable:z.boolean().optional()}).parse(req.body);return prisma.alumniProfile.update({where:{userId:req.user.sub},data:b});});

  app.post('/profile/avatar',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    try {
      const { buffer, mimetype } = await readFileFromRequest(req);
      const avatarUrl = await processAndStoreAvatar(buffer, mimetype, req.user.sub);
      await prisma.alumniProfile.update({where:{userId:req.user.sub},data:{avatarUrl}});
      const profile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});
      notifyAdmins('PROFILE',`Profile photo updated`,`${profile?.fullName||'A member'} updated their profile picture`,'/dashboard/alumni').catch(()=>{});
      return{avatarUrl};
    } catch(err:any) {
      if (err.message.includes('No file') || err.message.includes('Only') || err.message.includes('under 5MB')) return reply.code(400).send({error:err.message});
      console.error('Avatar upload error:',err);
      return reply.code(500).send({error:'Failed to process image: '+err.message});
    }
  });

  app.post('/support',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({subject:z.string().min(3),body:z.string().min(5)}).parse(req.body);return prisma.supportTicket.create({data:{userId:req.user.sub,...b}})});
  app.get('/support/my',{preHandler:[app.authenticate]},async(req:any)=>prisma.supportTicket.findMany({where:{userId:req.user.sub},orderBy:{createdAt:'desc'}}));

  app.get('/projects',async()=>prisma.project.findMany({where:{status:{in:['ACTIVE','FUNDED','IN_PROGRESS','COMPLETED']}},orderBy:{createdAt:'desc'}}));
  app.post('/projects',{preHandler:[app.authenticate,requireRoles('YEAR_ADMIN','ADMIN','SUPER_ADMIN')]},async(req)=>{const b=z.object({title:z.string(),description:z.string(),targetAmount:z.number().positive(),yearGroupId:z.string().optional(),imageUrl:z.string().optional()}).parse(req.body);return prisma.project.create({data:{...b,status:'ACTIVE'}})});
  app.post('/projects/:id/image',{preHandler:[app.authenticate,requireRoles('YEAR_ADMIN','ADMIN','SUPER_ADMIN')]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'projects',400,300);await prisma.project.update({where:{id:req.params.id},data:{imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.post('/projects/:id/contribute',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({amount:z.number().positive(),anonymous:z.boolean().default(false)}).parse(req.body);const result=await prisma.$transaction(async tx=>{const c=await tx.contribution.create({data:{projectId:req.params.id,userId:req.user.sub,amount:b.amount,anonymous:b.anonymous}});const proj=await tx.project.update({where:{id:req.params.id},data:{raisedAmount:{increment:b.amount}},select:{title:true}});return{c,proj};});const profile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});const donorName=b.anonymous?'An anonymous donor':(profile?.fullName||'A member');notifyAdmins('PROJECT',`New contribution to ${result.proj.title}`,`${donorName} contributed GHS ${b.amount.toLocaleString()}`,'/dashboard/projects').catch(()=>{});return result.c;});

  app.get('/events',async()=>prisma.event.findMany({orderBy:{startsAt:'asc'}}));
  app.post('/events',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const b=z.object({title:z.string(),description:z.string().optional(),startsAt:z.string().datetime(),endsAt:z.string().datetime().optional(),venue:z.string().optional(),streamUrl:z.string().url().optional(),ticketPrice:z.number().nonnegative().optional()}).parse(req.body);const ev=await prisma.event.create({data:{...b,startsAt:new Date(b.startsAt),endsAt:b.endsAt?new Date(b.endsAt):undefined}});const dateStr=new Date(b.startsAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});notifyAllUsers('EVENT',`New event: ${b.title}`,`${b.venue||'Online'} · ${dateStr}`,'/dashboard/events',undefined,true).catch(()=>{});return ev;});
  app.post('/events/:id/image',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'events',600,400);await prisma.event.update({where:{id:req.params.id},data:{imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});

  app.get('/businesses',async()=>prisma.business.findMany({where:{verified:true},take:100,include:{_count:{select:{campaigns:true}}}}));
  app.get('/businesses/mine',{preHandler:[app.authenticate]},async(req:any)=>prisma.business.findMany({where:{ownerId:req.user.sub},include:{_count:{select:{campaigns:true}}}}));
  app.post('/businesses',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({name:z.string().min(2),category:z.string().min(2),description:z.string().optional(),website:z.string().url().optional(),phone:z.string().optional(),logoUrl:z.string().url().optional(),location:z.string().optional()}).parse(req.body);return prisma.business.create({data:{ownerId:req.user.sub,...b}})});
  app.patch('/businesses/:id',{preHandler:[app.authenticate]},async(req:any,reply)=>{const b=z.object({name:z.string().min(2).optional(),category:z.string().min(2).optional(),description:z.string().optional(),website:z.string().url().optional(),phone:z.string().optional(),location:z.string().optional()}).parse(req.body);const business=await prisma.business.findFirst({where:{id:req.params.id,ownerId:req.user.sub}});if(!business)return reply.code(404).send({error:'Business not found'});return prisma.business.update({where:{id:req.params.id},data:b});});
  app.post('/businesses/:id/image',{preHandler:[app.authenticate]},async(req:any,reply)=>{try{const business=await prisma.business.findFirst({where:{id:req.params.id,ownerId:req.user.sub}});if(!business)return reply.code(404).send({error:'Business not found'});const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'businesses',600,400);await prisma.business.update({where:{id:req.params.id},data:{logoUrl:imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.post('/businesses/:id/ads',{preHandler:[app.authenticate]},async(req:any,reply)=>{const business=await prisma.business.findFirst({where:{id:req.params.id,ownerId:req.user.sub}});if(!business)return reply.code(404).send({error:'Business not found'});const b=z.object({placement:z.enum(['year_group','home','events','platform_wide']),durationDays:z.number().int().positive(),audience:z.string(),quotedAmount:z.number().positive(),creativeUrl:z.string().url().optional()}).parse(req.body);return prisma.adCampaign.create({data:{businessId:business.id,...b,status:'PENDING_APPROVAL'}})});

  app.get('/chat/rooms',{preHandler:[app.authenticate]},async()=>prisma.chatRoom.findMany({orderBy:{createdAt:'asc'},include:{_count:{select:{messages:true}},yearGroup:{select:{year:true,name:true}}}}));
  app.post('/chat/rooms',{preHandler:[app.authenticate]},async(req)=>{const b=z.object({name:z.string().min(2),yearGroupId:z.string().optional(),isAssemblyHall:z.boolean().default(false),imageUrl:z.string().optional()}).parse(req.body);return prisma.chatRoom.create({data:b})});
  app.post('/chat/rooms/:id/image',{preHandler:[app.authenticate]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'chatrooms',200,200);await prisma.chatRoom.update({where:{id:req.params.id},data:{imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.get('/chat/rooms/:id/messages',{preHandler:[app.authenticate]},async(req:any)=>{const q=z.object({cursor:z.string().optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).parse(req.query);return prisma.message.findMany({where:{roomId:req.params.id},orderBy:{createdAt:'desc'},take:q.limit,...(q.cursor?{skip:1,cursor:{id:q.cursor}}:{}) ,include:{user:{select:{profile:{select:{fullName:true,avatarUrl:true}}}}}})});
  app.post('/chat/rooms/:id/messages',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({body:z.string().min(1).max(4000)}).parse(req.body);const msg=await prisma.message.create({data:{roomId:req.params.id,userId:req.user.sub,body:b.body},include:{user:{select:{profile:{select:{fullName:true}}}}}});const room=await prisma.chatRoom.findUnique({where:{id:req.params.id}});if(room){const senderName=msg.user?.profile?.fullName||'A member';notifyAllUsers('CHAT',`New message in ${room.name}`,`${senderName}: ${b.body.slice(0,100)}`,`/dashboard/assembly`,req.user.sub).catch(()=>{});notifyAdmins('CHAT',`New chat message`,`${senderName} posted in ${room.name}`,'/dashboard/assembly').catch(()=>{});}return msg;});

  app.get('/elections',{preHandler:[app.authenticate]},async()=>prisma.election.findMany({orderBy:{opensAt:'desc'},include:{_count:{select:{candidates:true,votes:true}},yearGroup:{select:{year:true,name:true}}}}));
  app.post('/elections',{preHandler:[app.authenticate,requireRoles('YEAR_ADMIN','ADMIN','SUPER_ADMIN')]},async(req)=>{const b=z.object({title:z.string().min(2),description:z.string().optional(),yearGroupId:z.string().optional(),opensAt:z.string().datetime(),closesAt:z.string().datetime()}).parse(req.body);return prisma.election.create({data:{...b,opensAt:new Date(b.opensAt),closesAt:new Date(b.closesAt),status:'SCHEDULED'}})});
  app.post('/elections/:id/candidates',{preHandler:[app.authenticate,requireRoles('YEAR_ADMIN','ADMIN','SUPER_ADMIN')]},async(req:any)=>{const b=z.object({userId:z.string(),position:z.string(),manifesto:z.string().optional()}).parse(req.body);return prisma.candidate.create({data:{electionId:req.params.id,...b}})});
  app.get('/elections/:id', {preHandler:[app.authenticate]}, async(req:any)=>prisma.election.findUnique({where:{id:req.params.id},include:{candidates:{include:{user:{select:{profile:{select:{fullName:true,avatarUrl:true}}}}}},_count:{select:{candidates:true,votes:true}}}}));
  app.get('/elections/:id/results',{preHandler:[app.authenticate]},async(req:any,reply)=>{const election=await prisma.election.findUnique({where:{id:req.params.id}});if(!election)return reply.code(404).send({error:'Election not found'});if(!['OPEN','CLOSED','CERTIFIED'].includes(election.status)&&!['ADMIN','SUPER_ADMIN'].includes(req.user.role))return reply.code(403).send({error:'Results are not public yet'});return prisma.vote.groupBy({by:['candidateId','position'],where:{electionId:election.id},_count:{_all:true}})});
  app.post('/elections/:id/vote',{preHandler:[app.authenticate]},async(req:any,reply)=>{const b=z.object({candidateId:z.string(),position:z.string()}).parse(req.body);const e=await prisma.election.findUnique({where:{id:req.params.id}});if(!e||e.status!=='OPEN'||new Date()<e.opensAt||new Date()>e.closesAt)return reply.code(409).send({error:'Election is not open'});const candidate=await prisma.candidate.findFirst({where:{id:b.candidateId,electionId:e.id,position:b.position}});if(!candidate)return reply.code(400).send({error:'Invalid candidate'});try{const vote=await prisma.vote.create({data:{electionId:e.id,candidateId:b.candidateId,voterId:req.user.sub,position:b.position}});const election2=await prisma.election.findUnique({where:{id:e.id},include:{_count:{select:{votes:true}}}});notifyAllUsers('ELECTION',`New vote in ${e.title}`,`${election2?._count?.votes||0} total votes cast`,'/dashboard/elections').catch(()=>{});return vote;}catch{return reply.code(409).send({error:'You have already voted for this position'});}});

  app.get('/admin/stats',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async()=>{const [users,verified,projects,payments,openTickets,pendingAds,pendingQuotes]=await Promise.all([prisma.user.count(),prisma.user.count({where:{verification:'VERIFIED'}}),prisma.project.count(),prisma.payment.aggregate({_sum:{amount:true},where:{status:'PAID'}}),prisma.supportTicket.count({where:{status:{in:['OPEN','IN_PROGRESS']}}}),prisma.adCampaign.count({where:{status:'PENDING_APPROVAL'}}),prisma.quote.count({where:{status:{in:['DRAFT','SENT']}}})]);return{users,verified,projects,revenue:payments._sum.amount??0,openTickets,pendingAds,pendingQuotes};});
  app.get('/admin/members/pending',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async()=>prisma.user.findMany({where:{verification:'PENDING'},select:{id:true,email:true,phone:true,createdAt:true,profile:true}}));
  app.post('/admin/members/:id/verify',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const u=await prisma.user.update({where:{id:req.params.id},data:{verification:'VERIFIED'},select:{id:true,email:true,profile:{select:{fullName:true}}}});notifyUser(u.id,'SYSTEM','Your account has been verified','Congratulations! Your OPASS CONNECT account is now verified. You have full access to all features.','/dashboard',true).catch(()=>{});return u;});
  app.get('/admin/ads',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const q=z.object({status:z.string().optional()}).parse(req.query);return prisma.adCampaign.findMany({where:q.status?{status:q.status as any}:undefined,orderBy:{id:'desc'},include:{business:{select:{name:true,logoUrl:true,category:true}}}});});
  app.post('/admin/ads/:id/approve',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>prisma.adCampaign.update({where:{id:req.params.id},data:{status:'APPROVED'}}));
  app.post('/admin/ads/:id/reject',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>prisma.adCampaign.update({where:{id:req.params.id},data:{status:'REJECTED'}}));
  app.get('/admin/quotes',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async()=>prisma.quote.findMany({orderBy:{createdAt:'desc'},include:{intake:true,items:true}}));
  app.post('/admin/quotes/:id/approve',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const quote=await prisma.quote.update({where:{id:req.params.id},data:{status:'SENT'},include:{intake:true}});if(quote.intake?.clientEmail){const{sendEmail}=await import('./email.js');sendEmail(quote.intake.clientEmail,`Quote ${quote.quoteNumber} Approved`,`Your quote has been approved`,`<p>Your quote <strong>${quote.quoteNumber}</strong> has been approved.</p><p><strong>Total: ${quote.currency} ${Number(quote.total).toLocaleString()}</strong></p><p>Valid until: ${new Date(quote.expiresAt).toLocaleDateString('en-US',{dateStyle:'long'})}</p>`).catch(()=>{});}return quote;});
  app.get('/admin/activity',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async()=>{const [users,payments]=await Promise.all([prisma.user.findMany({orderBy:{createdAt:'desc'},take:5,select:{id:true,email:true,createdAt:true,profile:{select:{fullName:true}}}}),prisma.payment.findMany({where:{status:'PAID'},orderBy:{updatedAt:'desc'},take:5,select:{id:true,purpose:true,amount:true,currency:true,updatedAt:true,user:{select:{profile:{select:{fullName:true}}}}}})]);const events=[...users.map(u=>({id:'u-'+u.id,type:'user' as const,label:`${u.profile?.fullName||u.email} registered`,at:u.createdAt})),...payments.map(p=>({id:'p-'+p.id,type:'payment' as const,label:`${p.user.profile?.fullName||'Someone'} paid ${p.currency} ${Number(p.amount).toLocaleString()} for ${p.purpose}`,at:p.updatedAt}))];events.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());return events.slice(0,8);});
  app.get('/admin/users',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const q=z.object({search:z.string().optional()}).parse(req.query);return prisma.user.findMany({where:q.search?{OR:[{email:{contains:q.search,mode:'insensitive'}},{profile:{fullName:{contains:q.search,mode:'insensitive'}}}]}:undefined,orderBy:{createdAt:'desc'},take:100,select:{id:true,email:true,role:true,verification:true,createdAt:true,profile:{select:{fullName:true,graduationYear:true,avatarUrl:true}}}});});

  // ===== Support Tickets =====
  app.get('/tickets',{preHandler:[app.authenticate]},async(req:any)=>{if(['ADMIN','SUPER_ADMIN'].includes(req.user.role)){return prisma.supportTicket.findMany({orderBy:{createdAt:'desc'},take:100,include:{user:{select:{email:true,profile:{select:{fullName:true,avatarUrl:true}}}}}});}return prisma.supportTicket.findMany({where:{userId:req.user.sub},orderBy:{createdAt:'desc'},take:50});});
  app.post('/tickets',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({subject:z.string().min(3).max(200),body:z.string().min(10).max(5000)}).parse(req.body);const ticket=await prisma.supportTicket.create({data:{userId:req.user.sub,subject:b.subject,body:b.body}});notifyAdmins('SYSTEM','New support ticket',`Subject: ${b.subject}`,'/dashboard/admin',true).catch(()=>{});return ticket;});
  app.post('/tickets/:id/reply',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any,reply)=>{const b=z.object({message:z.string().min(1).max(5000)}).parse(req.body);const ticket=await prisma.supportTicket.findUnique({where:{id:req.params.id}});if(!ticket)return reply.code(404).send({error:'Ticket not found'});await prisma.supportTicket.update({where:{id:req.params.id},data:{status:'IN_PROGRESS',updatedAt:new Date()}});if(ticket.userId){notifyUser(ticket.userId,'SYSTEM',`Re: ${ticket.subject}`,b.message,'/dashboard/support',true).catch(()=>{});}return{ok:true};});
  app.post('/tickets/:id/close',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const ticket=await prisma.supportTicket.update({where:{id:req.params.id},data:{status:'CLOSED'}});if(ticket.userId){notifyUser(ticket.userId,'SYSTEM',`Ticket closed: ${ticket.subject}`,'Your support ticket has been resolved. If you need further help, please create a new ticket.','/dashboard/support').catch(()=>{});}return ticket;});

  // ===== Notifications =====
  app.get('/notifications',{preHandler:[app.authenticate]},async(req:any)=>{const q=z.object({unreadOnly:z.coerce.boolean().optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).parse(req.query);return prisma.notification.findMany({where:{userId:req.user.sub,...(q.unreadOnly?{read:false}:{})},orderBy:{createdAt:'desc'},take:q.limit});});
  app.get('/notifications/unread-count',{preHandler:[app.authenticate]},async(req:any)=>{const c=await prisma.notification.count({where:{userId:req.user.sub,read:false}});return{count:c};});
  app.post('/notifications/:id/read',{preHandler:[app.authenticate]},async(req:any)=>prisma.notification.updateMany({where:{id:req.params.id,userId:req.user.sub},data:{read:true}}).then(()=>({ok:true})));
  app.post('/notifications/read-all',{preHandler:[app.authenticate]},async(req:any)=>prisma.notification.updateMany({where:{userId:req.user.sub,read:false},data:{read:true}}).then(()=>({ok:true})));
  app.delete('/notifications/:id',{preHandler:[app.authenticate]},async(req:any)=>prisma.notification.deleteMany({where:{id:req.params.id,userId:req.user.sub}}).then(()=>({ok:true})));
}
