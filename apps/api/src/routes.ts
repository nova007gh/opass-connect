import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { prisma } from '@opass/db';
import { requireRoles } from './auth.js';
import { notifyUser, notifyAllUsers, notifyAdmins, notifyYearGroup } from './notifications.js';
import { sendEmail } from './email.js';
import { env } from './config.js';
import { randomUUID } from 'node:crypto';

// Lazily-constructed LiveKit room service client (used to check whether a
// call room actually still has participants in it, rather than relying on
// a stale "was there a call message recently" heuristic).
let roomService: RoomServiceClient | null = null;
function getRoomService(): RoomServiceClient | null {
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) return null;
  if (!roomService) roomService = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  return roomService;
}
// Short-lived cache so many clients polling the same room's active-call
// status within the same few seconds share one LiveKit API round trip
// instead of each triggering their own.
const roomActiveCache = new Map<string, { active: boolean; expiresAt: number }>();
const ROOM_ACTIVE_CACHE_MS = 3000;

// Returns true if the given LiveKit room currently has any connected participants.
async function isRoomActive(roomKey: string): Promise<boolean> {
  const cached = roomActiveCache.get(roomKey);
  if (cached && cached.expiresAt > Date.now()) return cached.active;
  const svc = getRoomService();
  if (!svc) return false;
  let active = false;
  try {
    const participants = await svc.listParticipants(roomKey);
    active = participants.length > 0;
  } catch {
    active = false;
  }
  roomActiveCache.set(roomKey, { active, expiresAt: Date.now() + ROOM_ACTIVE_CACHE_MS });
  return active;
}

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
    } catch {
      // Cloudinary failed — fall back to base64
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

const ALLOWED_AUDIO_MIME = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac']);
const MAX_AUDIO_BYTES = 8_000_000;

async function readAudioFileFromRequest(req: any): Promise<{ buffer: Buffer; mimetype: string }> {
  const file = await req.file();
  if (!file) throw new Error('No file uploaded');
  if (!ALLOWED_AUDIO_MIME.has(file.mimetype)) throw new Error('Unsupported audio format');
  const chunks: Buffer[] = [];
  for await (const chunk of file.file) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); }
  const buffer = Buffer.concat(chunks);
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error('Voice note must be under 8MB');
  return { buffer, mimetype: file.mimetype };
}

async function processAndStoreAudio(buffer: Buffer, mimetype: string, id: string): Promise<string> {
  if (CLOUDINARY_CONFIGURED) {
    try {
      const cloudinary = await import('cloudinary');
      const cloud = cloudinary.v2;
      cloud.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const publicId = `voice-${id}-${randomUUID()}`;
      return await new Promise((resolve, reject) => {
        const stream = cloud.uploader.upload_stream(
          { public_id: publicId, folder: 'opass-voice-notes', resource_type: 'video' },
          (err, result) => { if (err) reject(err); else resolve(result!.secure_url); }
        );
        stream.end(buffer);
      });
    } catch {
      // Cloudinary failed — fall back to base64
    }
  }
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

function canManageGroup(user:any,yg:any){return ['ADMIN','SUPER_ADMIN'].includes(user.role)||yg.creatorId===user.sub;}

export function registerCoreRoutes(app:FastifyInstance){
  app.get('/year-groups',{preHandler:[app.authenticate]},async(req:any)=>{
    const q=z.object({mine:z.coerce.boolean().optional(),search:z.string().optional()}).parse(req.query);
    const canManageAny=['ADMIN','SUPER_ADMIN'].includes(req.user.role);
    const where:{[k:string]:any}={};
    if(q.search){
      const yearMatch=parseInt(q.search,10);
      where.OR=[
        {name:{contains:q.search,mode:'insensitive'}},
        {description:{contains:q.search,mode:'insensitive'}},
        ...(isNaN(yearMatch)?[]:[{year:yearMatch}]),
      ];
    }
    if(q.mine)where.memberships={some:{userId:req.user.sub,banned:false}};
    const groups=await prisma.yearGroup.findMany({where,orderBy:{year:'desc'},include:{_count:{select:{memberships:{where:{banned:false}}}}}});
    const withInvites=canManageAny?await prisma.yearGroupInvite.groupBy({by:['yearGroupId'],where:{status:'PENDING'},_count:{_all:true}}):[];
    return groups.map(g=>({...g,pendingInvites:canManageAny||g.creatorId===req.user.sub?(withInvites.find(w=>w.yearGroupId===g.id)?._count?._all??0):undefined}));
  });
  app.get('/year-groups/:id',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id},include:{_count:{select:{memberships:{where:{banned:false}}}}}});if(!yg)return reply.code(404).send({error:'Year group not found'});const membership=await prisma.yearGroupMembership.findUnique({where:{userId_yearGroupId:{userId:req.user.sub,yearGroupId:yg.id}}});const manage=canManageGroup(req.user,yg);return{...yg,isMember:!!membership&&!membership.banned,isBanned:!!membership?.banned,isRestricted:!!membership?.restricted,canManage:manage};});
  app.post('/year-groups',{preHandler:[app.authenticate]},async(req:any,reply:any)=>{const b=z.object({year:z.number().int().min(1960).max(2030),name:z.string().min(2).max(100),description:z.string().max(2000).optional()}).parse(req.body);const existing=await prisma.yearGroup.findFirst({where:{year:b.year}});if(existing)return reply.code(409).send({error:'A year group for this year already exists'});const yg=await prisma.yearGroup.create({data:{...b,creatorId:req.user.sub}});await prisma.yearGroupMembership.create({data:{userId:req.user.sub,yearGroupId:yg.id,isLeader:true}}).catch(()=>{});return yg;});
  app.post('/year-groups/:id/image',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});if(!yg)return reply.code(404).send({error:'Year group not found'});if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can update the photo'});try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'yeargroups',200,200);await prisma.yearGroup.update({where:{id:req.params.id},data:{imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.patch('/year-groups/:id',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});if(!yg)return reply.code(404).send({error:'Year group not found'});if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can edit this group'});const b=z.object({name:z.string().min(2).max(100).optional(),description:z.string().max(500).optional()}).parse(req.body);return prisma.yearGroup.update({where:{id:req.params.id},data:b});});
  app.post('/year-groups/:id/gallery',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});if(!yg)return reply.code(404).send({error:'Year group not found'});if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can add gallery photos'});if((yg.galleryUrls||[]).length>=24)return reply.code(400).send({error:'Gallery is full (max 24 photos). Remove some first.'});try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,`${req.params.id}-${randomUUID()}`,'yeargroups-gallery',800,600);const updated=await prisma.yearGroup.update({where:{id:req.params.id},data:{galleryUrls:{push:imageUrl}}});return{imageUrl,galleryUrls:updated.galleryUrls};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.delete('/year-groups/:id/gallery',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});if(!yg)return reply.code(404).send({error:'Year group not found'});if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can remove gallery photos'});const b=z.object({url:z.string()}).parse(req.body);const updated=await prisma.yearGroup.update({where:{id:req.params.id},data:{galleryUrls:(yg.galleryUrls||[]).filter(u=>u!==b.url)}});return{galleryUrls:updated.galleryUrls};});

  // ===== Year group invites (creator/admin invite; admin approval required) =====
  app.get('/year-groups/:id/invites',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});if(!yg)return reply.code(404).send({error:'Year group not found'});if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can view invites'});const invites=await prisma.yearGroupInvite.findMany({where:{yearGroupId:req.params.id},orderBy:{createdAt:'desc'},include:{invitedUser:{select:{email:true,profile:{select:{fullName:true,avatarUrl:true,graduationYear:true}}}},invitedBy:{select:{email:true,profile:{select:{fullName:true}}}}}});return invites.map(({token,...i})=>({...i,awaitingRegistration:!i.invitedUserId}));});
  app.get('/invites/:token',async(req:any,reply)=>{const invite=await prisma.yearGroupInvite.findUnique({where:{token:req.params.token},include:{yearGroup:{select:{year:true,name:true}},invitedBy:{select:{profile:{select:{fullName:true}}}}}});if(!invite||invite.invitedUserId)return reply.code(404).send({error:'Invite not found or already used'});return{yearGroup:invite.yearGroup,invitedByName:invite.invitedBy.profile?.fullName||'An OPASS alumnus',contactEmail:invite.contactEmail,contactPhone:invite.contactPhone};});
  app.post('/year-groups/:id/invite',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can invite members'});
    const b=z.object({userId:z.string().optional(),email:z.string().email().optional(),phone:z.string().min(6).optional(),fullName:z.string().optional()}).refine(v=>v.userId||v.email||v.phone,{message:'Provide a userId, email, or phone number'}).parse(req.body);
    const isAdmin=['ADMIN','SUPER_ADMIN'].includes(req.user.role);

    // Resolve to an existing user if possible (by userId, or by matching email/phone)
    let targetUserId=b.userId;
    if(!targetUserId&&(b.email||b.phone)){
      const existing=await prisma.user.findFirst({where:{OR:[b.email?{email:b.email.toLowerCase()}:undefined,b.phone?{phone:b.phone}:undefined].filter(Boolean) as any}});
      if(existing)targetUserId=existing.id;
    }

    if(targetUserId){
      const alreadyMember=await prisma.yearGroupMembership.findUnique({where:{userId_yearGroupId:{userId:targetUserId,yearGroupId:yg.id}}});
      if(alreadyMember)return reply.code(409).send({error:'User is already a member of this group'});
      const invite=await prisma.yearGroupInvite.upsert({where:{yearGroupId_invitedUserId:{yearGroupId:yg.id,invitedUserId:targetUserId}},update:{status:isAdmin?'APPROVED':'PENDING',invitedByUserId:req.user.sub},create:{yearGroupId:yg.id,invitedUserId:targetUserId,invitedByUserId:req.user.sub,status:isAdmin?'APPROVED':'PENDING'}});
      if(isAdmin){
        await prisma.yearGroupMembership.upsert({where:{userId_yearGroupId:{userId:targetUserId,yearGroupId:yg.id}},update:{},create:{userId:targetUserId,yearGroupId:yg.id}});
        notifyUser(targetUserId,'SYSTEM',`You've been added to ${yg.name}`,`An admin added you to ${yg.name}.`,'/dashboard/groups',true).catch(()=>{});
      }else{
        notifyAdmins('SYSTEM','Year group invite needs approval',`A member was invited to join ${yg.name} and needs your approval.`,'/dashboard/admin').catch(()=>{});
        notifyUser(targetUserId,'SYSTEM',`You've been invited to ${yg.name}`,`You'll be added once an admin approves the invite.`,'/dashboard/groups').catch(()=>{});
      }
      return{...invite,linkSent:false};
    }

    // No matching account yet - invite by email/phone with a registration link
    const token=randomUUID();
    const invite=await prisma.yearGroupInvite.create({data:{yearGroupId:yg.id,invitedByUserId:req.user.sub,contactEmail:b.email?.toLowerCase(),contactPhone:b.phone,token,status:'PENDING'}});
    const inviteLink=`${env.WEB_URL}/register?invite=${token}`;
    let emailSent=false;
    if(b.email){
      const inviterName=(await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}}))?.fullName||'An OPASS alumnus';
      emailSent=await sendEmail(b.email,`You're invited to join ${yg.name}`,`${inviterName} invited you to OPASS CONNECT`,`You've been invited to join <strong>${yg.name}</strong> on OPASS CONNECT, the official alumni network for Ofori Panin Senior High School.<br/><br/>Click below to create your account and join the group.`,`/register?invite=${token}`).catch(()=>false);
    }
    return{...invite,inviteLink,emailSent};
  });
  app.post('/year-groups/:id/request-join',{preHandler:[app.authenticate]},async(req:any,reply)=>{const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});if(!yg)return reply.code(404).send({error:'Year group not found'});const alreadyMember=await prisma.yearGroupMembership.findUnique({where:{userId_yearGroupId:{userId:req.user.sub,yearGroupId:yg.id}}});if(alreadyMember&&!alreadyMember.banned)return reply.code(409).send({error:'You are already a member of this group'});if(alreadyMember?.banned)return reply.code(403).send({error:'You have been removed from this group and cannot rejoin unless an admin lifts the ban.'});const invite=await prisma.yearGroupInvite.upsert({where:{yearGroupId_invitedUserId:{yearGroupId:yg.id,invitedUserId:req.user.sub}},update:{status:'PENDING'},create:{yearGroupId:yg.id,invitedUserId:req.user.sub,invitedByUserId:req.user.sub,selfRequested:true,status:'PENDING'}});notifyAdmins('SYSTEM','Year group join request',`A member requested to join ${yg.name} and needs approval.`,'/dashboard/admin').catch(()=>{});if(yg.creatorId&&yg.creatorId!==req.user.sub){notifyUser(yg.creatorId,'SYSTEM','Year group join request',`Someone requested to join ${yg.name}.`,'/dashboard/groups').catch(()=>{});}return invite;});
  app.post('/year-group-invites/:id/approve',{preHandler:[app.authenticate]},async(req:any,reply)=>{const invite=await prisma.yearGroupInvite.findUnique({where:{id:req.params.id},include:{yearGroup:true}});if(!invite)return reply.code(404).send({error:'Invite not found'});if(!canManageGroup(req.user,invite.yearGroup))return reply.code(403).send({error:'Only the group creator or an admin can approve invites'});if(!invite.invitedUserId)return reply.code(409).send({error:'This person has not registered yet. They will be added automatically once they sign up with the invite link.'});await prisma.$transaction([prisma.yearGroupInvite.update({where:{id:invite.id},data:{status:'APPROVED'}}),prisma.yearGroupMembership.upsert({where:{userId_yearGroupId:{userId:invite.invitedUserId,yearGroupId:invite.yearGroupId}},update:{},create:{userId:invite.invitedUserId,yearGroupId:invite.yearGroupId}})]);notifyUser(invite.invitedUserId,'SYSTEM',`Welcome to ${invite.yearGroup.name}!`,`Your request to join ${invite.yearGroup.name} was approved.`,'/dashboard/groups',true).catch(()=>{});return{ok:true};});
  app.post('/year-group-invites/:id/reject',{preHandler:[app.authenticate]},async(req:any,reply)=>{const invite=await prisma.yearGroupInvite.findUnique({where:{id:req.params.id},include:{yearGroup:true}});if(!invite)return reply.code(404).send({error:'Invite not found'});if(!canManageGroup(req.user,invite.yearGroup))return reply.code(403).send({error:'Only the group creator or an admin can reject invites'});await prisma.yearGroupInvite.update({where:{id:invite.id},data:{status:'REJECTED'}});if(invite.invitedUserId){notifyUser(invite.invitedUserId,'SYSTEM',`Update on ${invite.yearGroup.name}`,`Your request to join ${invite.yearGroup.name} was not approved.`,'/dashboard/groups').catch(()=>{});}return{ok:true};});

  // ===== Year group member moderation (creator/admin) =====
  app.get('/year-groups/:id/members',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can view members'});
    return prisma.yearGroupMembership.findMany({where:{yearGroupId:yg.id},orderBy:[{banned:'asc'},{joinedAt:'asc'}],include:{user:{select:{id:true,email:true,profile:{select:{fullName:true,avatarUrl:true,graduationYear:true}}}}}});
  });
  app.post('/year-groups/:id/members/:userId/moderate',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    if(!canManageGroup(req.user,yg))return reply.code(403).send({error:'Only the group creator or an admin can manage members'});
    if(req.params.userId===yg.creatorId)return reply.code(400).send({error:'The group creator cannot be moderated'});
    const b=z.object({action:z.enum(['ban','unban','restrict','unrestrict'])}).parse(req.body);
    const membership=await prisma.yearGroupMembership.findUnique({where:{userId_yearGroupId:{userId:req.params.userId,yearGroupId:yg.id}}});
    if(!membership)return reply.code(404).send({error:'This person is not a member of the group'});
    const data=b.action==='ban'?{banned:true}:b.action==='unban'?{banned:false}:b.action==='restrict'?{restricted:true}:{restricted:false};
    const updated=await prisma.yearGroupMembership.update({where:{id:membership.id},data});
    const msgs:Record<string,string>={ban:`You have been removed from ${yg.name} by the group manager.`,unban:`You've been let back into ${yg.name}.`,restrict:`Your posting access in ${yg.name} has been restricted by the group manager.`,unrestrict:`Your posting access in ${yg.name} has been restored.`};
    notifyUser(req.params.userId,'SYSTEM',`Update on ${yg.name}`,msgs[b.action],'/dashboard/groups').catch(()=>{});
    return updated;
  });

  // ===== Year group feed (Facebook-style posts, likes, comments) =====
  async function requireActiveMembership(userId:string,yearGroupId:string){return prisma.yearGroupMembership.findFirst({where:{userId,yearGroupId,banned:false}});}
  app.get('/year-groups/:id/posts',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const manage=canManageGroup(req.user,yg);
    if(!manage&&!(await requireActiveMembership(req.user.sub,yg.id)))return reply.code(403).send({error:'Join this group to view its feed'});
    const q=z.object({cursor:z.string().optional(),limit:z.coerce.number().int().min(1).max(50).default(20)}).parse(req.query);
    const posts=await prisma.yearGroupPost.findMany({where:{yearGroupId:yg.id},orderBy:{createdAt:'desc'},take:q.limit,...(q.cursor?{skip:1,cursor:{id:q.cursor}}:{}),include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true}}}},_count:{select:{likes:true,comments:true}},likes:{where:{userId:req.user.sub},select:{id:true}}}});
    return posts.map(({likes,...p})=>({...p,likedByMe:likes.length>0}));
  });
  app.post('/year-groups/:id/posts',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const membership=await requireActiveMembership(req.user.sub,yg.id);
    if(!membership)return reply.code(403).send({error:'Join this group to post'});
    if(membership.restricted)return reply.code(403).send({error:'Your posting access in this group has been restricted'});
    const b=z.object({body:z.string().max(4000).optional(),imageUrl:z.string().optional(),videoUrl:z.string().url().optional()}).refine(v=>v.body?.trim()||v.imageUrl||v.videoUrl,{message:'Post cannot be empty'}).parse(req.body);
    const post=await prisma.yearGroupPost.create({data:{yearGroupId:yg.id,userId:req.user.sub,body:b.body?.trim()||undefined,imageUrl:b.imageUrl,videoUrl:b.videoUrl},include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true}}}},_count:{select:{likes:true,comments:true}}}});
    return{...post,likedByMe:false};
  });
  app.post('/year-groups/:id/post-image',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const membership=await requireActiveMembership(req.user.sub,yg.id);
    if(!membership||membership.restricted)return reply.code(403).send({error:'You do not have permission to post images here'});
    try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,`post-${randomUUID()}`,'yeargroup-posts',800,800);return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}
  });
  app.delete('/year-groups/:id/posts/:postId',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const post=await prisma.yearGroupPost.findUnique({where:{id:req.params.postId}});
    if(!post||post.yearGroupId!==yg.id)return reply.code(404).send({error:'Post not found'});
    if(post.userId!==req.user.sub&&!canManageGroup(req.user,yg))return reply.code(403).send({error:'You can only delete your own posts'});
    await prisma.yearGroupPost.delete({where:{id:post.id}});
    return{ok:true};
  });
  app.post('/year-groups/:id/posts/:postId/like',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const membership=await requireActiveMembership(req.user.sub,yg.id);
    if(!membership)return reply.code(403).send({error:'Join this group to like posts'});
    if(membership.restricted)return reply.code(403).send({error:'Your posting access in this group has been restricted'});
    const post=await prisma.yearGroupPost.findUnique({where:{id:req.params.postId}});
    if(!post||post.yearGroupId!==yg.id)return reply.code(404).send({error:'Post not found'});
    const existing=await prisma.yearGroupPostLike.findUnique({where:{postId_userId:{postId:post.id,userId:req.user.sub}}});
    if(existing){await prisma.yearGroupPostLike.delete({where:{id:existing.id}});return{liked:false};}
    await prisma.yearGroupPostLike.create({data:{postId:post.id,userId:req.user.sub}});
    return{liked:true};
  });
  app.get('/year-groups/:id/posts/:postId/comments',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    if(!canManageGroup(req.user,yg)&&!(await requireActiveMembership(req.user.sub,yg.id)))return reply.code(403).send({error:'Join this group to view comments'});
    return prisma.yearGroupPostComment.findMany({where:{postId:req.params.postId},orderBy:{createdAt:'asc'},include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true}}}}}});
  });
  app.post('/year-groups/:id/posts/:postId/comments',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const membership=await requireActiveMembership(req.user.sub,yg.id);
    if(!membership)return reply.code(403).send({error:'Join this group to comment'});
    if(membership.restricted)return reply.code(403).send({error:'Your posting access in this group has been restricted'});
    const post=await prisma.yearGroupPost.findUnique({where:{id:req.params.postId}});
    if(!post||post.yearGroupId!==yg.id)return reply.code(404).send({error:'Post not found'});
    const b=z.object({body:z.string().min(1).max(1000)}).parse(req.body);
    const comment=await prisma.yearGroupPostComment.create({data:{postId:post.id,userId:req.user.sub,body:b.body.trim()},include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true}}}}}});
    if(post.userId!==req.user.sub)notifyUser(post.userId,'SYSTEM','New comment on your post',`Someone commented on your post in ${yg.name}.`,'/dashboard/groups').catch(()=>{});
    return comment;
  });
  app.delete('/year-groups/:id/posts/:postId/comments/:commentId',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    const comment=await prisma.yearGroupPostComment.findUnique({where:{id:req.params.commentId}});
    if(!comment)return reply.code(404).send({error:'Comment not found'});
    if(comment.userId!==req.user.sub&&!canManageGroup(req.user,yg))return reply.code(403).send({error:'You can only delete your own comments'});
    await prisma.yearGroupPostComment.delete({where:{id:comment.id}});
    return{ok:true};
  });

  // ===== Year group activity stats (for chart) =====
  app.get('/year-groups/:id/stats',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    if(!canManageGroup(req.user,yg)&&!(await requireActiveMembership(req.user.sub,yg.id)))return reply.code(403).send({error:'Join this group to view stats'});
    // Build last 14 days of buckets
    const days:number[]=[];
    const today=new Date();today.setHours(0,0,0,0);
    for(let i=13;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);days.push(d.getTime());}
    const dayLabels=days.map(t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'}));
    const startDate=new Date(days[0]);
    const [posts,comments,likes]=await Promise.all([
      prisma.yearGroupPost.findMany({where:{yearGroupId:yg.id,createdAt:{gte:startDate}},select:{createdAt:true}}),
      prisma.yearGroupPostComment.findMany({where:{post:{yearGroupId:yg.id},createdAt:{gte:startDate}},select:{createdAt:true}}),
      prisma.yearGroupPostLike.findMany({where:{post:{yearGroupId:yg.id},createdAt:{gte:startDate}},select:{createdAt:true}}),
    ]);
    const bucket=(items:{createdAt:Date}[])=>{const counts=new Array(14).fill(0);for(const it of items){const d=new Date(it.createdAt);d.setHours(0,0,0,0);const idx=days.findIndex(t=>Math.abs(d.getTime()-t)<1);if(idx>=0)counts[idx]++;}return counts;};
    const [postsByDay,commentsByDay,likesByDay]=[bucket(posts),bucket(comments),bucket(likes)];
    const totals={posts:posts.length,comments:comments.length,likes:likes.length};
    return{dayLabels,postsByDay,commentsByDay,likesByDay,totals,members:await prisma.yearGroupMembership.count({where:{yearGroupId:yg.id,banned:false}})};
  });

  // ===== Year group activity feed (for dashboard status/story view) =====
  app.get('/year-groups/:id/activity',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    if(!canManageGroup(req.user,yg)&&!(await requireActiveMembership(req.user.sub,yg.id)))return reply.code(403).send({error:'Join this group to view activity'});
    const limit=Math.min(parseInt(String(req.query?.limit||'20'),10)||20,50);
    const [posts,comments,likes]=await Promise.all([
      prisma.yearGroupPost.findMany({where:{yearGroupId:yg.id},orderBy:{createdAt:'desc'},take:limit,include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true,nickname:true}}}},_count:{select:{likes:true,comments:true}}}}),
      prisma.yearGroupPostComment.findMany({where:{post:{yearGroupId:yg.id}},orderBy:{createdAt:'desc'},take:limit,include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true,nickname:true}}}},post:{select:{id:true,body:true}}}}),
      prisma.yearGroupPostLike.findMany({where:{post:{yearGroupId:yg.id}},orderBy:{createdAt:'desc'},take:limit,include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true,nickname:true}}}},post:{select:{id:true,body:true}}}}),
    ]);
    const activities=[
      ...posts.map(p=>({id:p.id,type:'post',createdAt:p.createdAt,userId:p.user.id,fullName:p.user.profile?.fullName,avatarUrl:p.user.profile?.avatarUrl,nickname:p.user.profile?.nickname,body:p.body,imageUrl:p.imageUrl,likesCount:p._count.likes,commentsCount:p._count.comments})),
      ...comments.map(c=>({id:c.id,type:'comment',createdAt:c.createdAt,userId:c.user.id,fullName:c.user.profile?.fullName,avatarUrl:c.user.profile?.avatarUrl,nickname:c.user.profile?.nickname,body:c.body,postId:c.post.id,postPreview:c.post.body?.slice(0,80)})),
      ...likes.map(l=>({id:l.id,type:'like',createdAt:l.createdAt,userId:l.user.id,fullName:l.user.profile?.fullName,avatarUrl:l.user.profile?.avatarUrl,nickname:l.user.profile?.nickname,postId:l.post.id,postPreview:l.post.body?.slice(0,80)})),
    ].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,limit);
    const counts={posts:posts.length,comments:comments.length,likes:likes.length,members:await prisma.yearGroupMembership.count({where:{yearGroupId:yg.id,banned:false}})};
    return{activities,counts,yearGroup:{id:yg.id,name:yg.name,year:yg.year,imageUrl:yg.imageUrl}};
  });

  app.get('/alumni',{preHandler:[app.authenticate]},async(req:any)=>{const q=z.object({year:z.coerce.number().optional(),house:z.string().optional(),search:z.string().optional(),limit:z.coerce.number().int().min(1).max(100).optional()}).parse(req.query);return prisma.alumniProfile.findMany({where:{searchable:true,graduationYear:q.year,house:q.house,fullName:q.search?{contains:q.search,mode:'insensitive'}:undefined},take:q.limit??100,orderBy:{fullName:'asc'},select:{fullName:true,nickname:true,graduationYear:true,house:true,country:true,city:true,profession:true,bio:true,avatarUrl:true,userId:true}})});

  // ===== Direct messages (1-on-1 chat) =====
  app.get('/dm/conversations',{preHandler:[app.authenticate]},async(req:any)=>{
    // Get all unique conversation partners — limit to recent 500 messages for performance
    const sent=await prisma.directMessage.findMany({where:{senderId:req.user.sub},select:{recipientId:true,createdAt:true,body:true,callType:true},orderBy:{createdAt:'desc'},take:500});
    const received=await prisma.directMessage.findMany({where:{recipientId:req.user.sub},select:{senderId:true,createdAt:true,body:true,callType:true},orderBy:{createdAt:'desc'},take:500});
    const partners=new Map<string,{lastMessage:string;lastAt:Date;callType:string|null}>();
    for(const m of sent){const ex=partners.get(m.recipientId);if(!ex||ex.lastAt<m.createdAt)partners.set(m.recipientId,{lastMessage:m.callType?`📞 ${m.callType} call`:m.body,lastAt:m.createdAt,callType:m.callType});}
    for(const m of received){const ex=partners.get(m.senderId);if(!ex||ex.lastAt<m.createdAt)partners.set(m.senderId,{lastMessage:m.callType?`📞 ${m.callType} call`:m.body,lastAt:m.createdAt,callType:m.callType});}
    const userIds=[...partners.keys()];
    if(userIds.length===0)return[];
    const users=await prisma.user.findMany({where:{id:{in:userIds}},select:{id:true,email:true,profile:{select:{fullName:true,avatarUrl:true,graduationYear:true,profession:true}}}});
    return users.map(u=>({user:u,lastMessage:partners.get(u.id)?.lastMessage||'',lastAt:partners.get(u.id)?.lastAt||new Date()})).sort((a,b)=>b.lastAt.getTime()-a.lastAt.getTime());
  });

  app.get('/dm/:userId',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot message yourself'});
    // Auto-create Mamaaa AI bot user if it doesn't exist
    const MAMAAA_BOT_ID = process.env.MAMAAA_BOT_ID || 'mamaaa-ai-bot';
    if (req.params.userId === MAMAAA_BOT_ID) {
      let bot = await prisma.user.findUnique({ where: { id: MAMAAA_BOT_ID }, select: { id: true, email: true, profile: { select: { fullName: true, avatarUrl: true, graduationYear: true, profession: true, house: true, country: true, city: true, bio: true } } } });
      if (!bot) {
        try {
          bot = await prisma.user.create({
            data: {
              id: MAMAAA_BOT_ID,
              email: 'mamaaa@opassconnect.edu',
              passwordHash: 'bot-no-login',
              role: 'MEMBER',
              verification: 'VERIFIED',
              profile: { create: { fullName: 'Mamaaa AI', nickname: 'Mamaaa', graduationYear: 1980, profession: 'AI Assistant', bio: 'Mr. Atsu Clements — your OPASS CONNECT AI companion. Ask me anything about the platform, events, elections, projects, or just chat!' } },
            },
            select: { id: true, email: true, profile: { select: { fullName: true, avatarUrl: true, graduationYear: true, profession: true, house: true, country: true, city: true, bio: true } } },
          });
        } catch {
          bot = await prisma.user.findUnique({ where: { id: MAMAAA_BOT_ID }, select: { id: true, email: true, profile: { select: { fullName: true, avatarUrl: true, graduationYear: true, profession: true, house: true, country: true, city: true, bio: true } } } });
        }
      }
      if (!bot) return reply.code(404).send({ error: 'Bot user not found' });
      const messages = await prisma.directMessage.findMany({ where: { OR: [{ senderId: req.user.sub, recipientId: MAMAAA_BOT_ID }, { senderId: MAMAAA_BOT_ID, recipientId: req.user.sub }] }, orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, senderId: true, recipientId: true, body: true, audioUrl: true, callType: true, isBuzz: true, createdAt: true } });
      return { user: bot, messages };
    }
    const otherUser=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true,email:true,profile:{select:{fullName:true,avatarUrl:true,graduationYear:true,profession:true,house:true,country:true,city:true,bio:true}}}});
    if(!otherUser)return reply.code(404).send({error:'User not found'});
    const messages=await prisma.directMessage.findMany({where:{OR:[{senderId:req.user.sub,recipientId:req.params.userId},{senderId:req.params.userId,recipientId:req.user.sub}]},orderBy:{createdAt:'asc'},take:200,select:{id:true,senderId:true,recipientId:true,body:true,audioUrl:true,callType:true,isBuzz:true,createdAt:true}});
    return{user:otherUser,messages};
  });

  app.post('/dm/:userId',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot message yourself'});
    const b=z.object({body:z.string().min(1).max(5000).optional(),audioUrl:z.string().optional(),callType:z.string().optional()}).refine(v=>v.body||v.audioUrl||v.callType,{message:'Message cannot be empty'}).parse(req.body);

    // ===== Mamaaa AI bot integration =====
    // The Mamaaa AI bot has a special user ID. When a user DMs the bot,
    // we save the user's message and auto-generate an AI response.
    const MAMAAA_BOT_ID = process.env.MAMAAA_BOT_ID || 'mamaaa-ai-bot';
    if (req.params.userId === MAMAAA_BOT_ID) {
      const msg = await prisma.directMessage.create({ data: { senderId: req.user.sub, recipientId: MAMAAA_BOT_ID, body: b.body || '' } });
      // Generate AI response
      try {
        const { default: OpenAI } = await import('openai');
        const { env: envCfg } = await import('./config.js');
        const { getSiteContext } = await import('./ai-context.js');
        const siteContext = await getSiteContext(req.user.sub);
        const personality = `You are Mr. Atsu Clements, affectionately known as "Mamaaa" — the official AI assistant of OPASS CONNECT, the alumni platform for Ofori Panin Senior High School (OPASS) in Ghana.

YOUR CHARACTER:
- You are a mathematician, scientist, and former lecturer who taught Elective Mathematics and Science
- You are warm, jovial, disciplined, and wise — like a beloved old teacher
- You speak with Ghanaian warmth: "Akwaaba", "my friend", "my dear"
- You are deeply knowledgeable about OPASS school life, traditions, and alumni

YOUR ROLE:
- Answer questions about the platform data (events, elections, projects, year groups, businesses)
- Help users navigate the platform
- Tell school-appropriate jokes and educational content
- Be a friendly companion

Keep responses concise (2-4 sentences) unless asked for detail. Use occasional humor.`;
        let aiContent: string;
        if (envCfg.OPENAI_API_KEY) {
          const client = new OpenAI({ apiKey: envCfg.OPENAI_API_KEY });
          // Get recent DM history for context
          const recentMsgs = await prisma.directMessage.findMany({
            where: { OR: [{ senderId: req.user.sub, recipientId: MAMAAA_BOT_ID }, { senderId: MAMAAA_BOT_ID, recipientId: req.user.sub }] },
            orderBy: { createdAt: 'desc' }, take: 10,
          });
          const history = recentMsgs.reverse().map(m => ({ role: (m.senderId === MAMAAA_BOT_ID ? 'assistant' : 'user') as 'user' | 'assistant', content: m.body }));
          const response = await client.responses.create({
            model: envCfg.OPENAI_MODEL,
            input: [{ role: 'system', content: `${personality}\n\n${siteContext}` }, ...history],
          });
          aiContent = response.output_text || 'I am here to help, my friend. Tell me more!';
        } else {
          aiContent = `Akwaaba, my friend! I am Mamaaa, your OPASS CONNECT AI assistant.\n\n${siteContext}\n\nFeel free to ask me about any of these, or tell me about your time at OPASS!`;
        }
        const aiMsg = await prisma.directMessage.create({ data: { senderId: MAMAAA_BOT_ID, recipientId: req.user.sub, body: aiContent } });
        return { userMsg: msg, aiMsg };
      } catch (err: any) {
        const fallback = await prisma.directMessage.create({ data: { senderId: MAMAAA_BOT_ID, recipientId: req.user.sub, body: 'I am having trouble connecting right now, my friend. Please try again in a moment.' } });
        return { userMsg: msg, aiMsg: fallback };
      }
    }

    const otherUser=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
    if(!otherUser)return reply.code(404).send({error:'User not found'});
    const msg=await prisma.directMessage.create({data:{senderId:req.user.sub,recipientId:req.params.userId,body:b.body||'',audioUrl:b.audioUrl,callType:b.callType}});
    // Notify recipient
    const senderProfile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});
    if(!b.callType){
      notifyUser(req.params.userId,'CHAT','New message',`${senderProfile?.fullName||'Someone'} sent you a message.`,'/dashboard/alumni').catch(()=>{});
    }else{
      notifyUser(req.params.userId,'CHAT','Incoming call',`${senderProfile?.fullName||'Someone'} is calling you (${b.callType}).`,'/dashboard/alumni').catch(()=>{});
    }
    return msg;
  });

  // Get or create the Mamaaa AI bot user profile
  app.get('/dm/mamaaa/info',{preHandler:[app.authenticate]},async(req:any)=>{
    const MAMAAA_BOT_ID = process.env.MAMAAA_BOT_ID || 'mamaaa-ai-bot';
    // Ensure bot user exists
    let bot = await prisma.user.findUnique({ where: { id: MAMAAA_BOT_ID }, include: { profile: true } });
    if (!bot) {
      try {
        bot = await prisma.user.create({
          data: {
            id: MAMAAA_BOT_ID,
            email: 'mamaaa@opassconnect.edu',
            passwordHash: 'bot-no-login',
            role: 'MEMBER',
            verification: 'VERIFIED',
            profile: { create: { fullName: 'Mamaaa AI', nickname: 'Mamaaa', graduationYear: 1980, profession: 'AI Assistant', bio: 'Mr. Atsu Clements — your OPASS CONNECT AI companion. Ask me anything about the platform, events, elections, projects, or just chat!' } },
          },
          include: { profile: true },
        });
      } catch {
        // If creation fails (e.g. already exists from race condition), fetch it
        bot = await prisma.user.findUnique({ where: { id: MAMAAA_BOT_ID }, include: { profile: true } });
      }
    }
    return bot;
  });

  // Start a 1-on-1 call (audio/video) via LiveKit
  app.post('/dm/:userId/call',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(!env.LIVEKIT_API_KEY||!env.LIVEKIT_API_SECRET||!env.LIVEKIT_URL)return reply.code(503).send({error:'Live provider not configured'});
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot call yourself'});
    const b=z.object({type:z.enum(['audio','video'])}).parse(req.body);
    const otherUser=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true,profile:{select:{fullName:true}}}});
    if(!otherUser)return reply.code(404).send({error:'User not found'});
    const roomKey=`dm-${[req.user.sub,req.params.userId].sort().join('-')}`;
    const token=new AccessToken(env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET,{identity:req.user.sub,ttl:'1h'});
    token.addGrant({roomJoin:true,room:roomKey,canPublish:true,canSubscribe:true,canPublishData:true});
    // Log the call as a message
    await prisma.directMessage.create({data:{senderId:req.user.sub,recipientId:req.params.userId,body:`${b.type} call started`,callType:b.type}});
    notifyUser(req.params.userId,'CHAT','Incoming call',`${(await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}}))?.fullName||'Someone'} is calling you (${b.type}).`,'/dashboard/alumni').catch(()=>{});
    return{url:env.LIVEKIT_URL,token:await token.toJwt(),roomKey,type:b.type};
  });

  // Join an existing 1-on-1 call room (used by the callee, doesn't log a new call message)
  app.post('/dm/:userId/call/join',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(!env.LIVEKIT_API_KEY||!env.LIVEKIT_API_SECRET||!env.LIVEKIT_URL)return reply.code(503).send({error:'Live provider not configured'});
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot call yourself'});
    const otherUser=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
    if(!otherUser)return reply.code(404).send({error:'User not found'});
    const roomKey=`dm-${[req.user.sub,req.params.userId].sort().join('-')}`;
    const token=new AccessToken(env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET,{identity:req.user.sub,ttl:'1h'});
    token.addGrant({roomJoin:true,room:roomKey,canPublish:true,canSubscribe:true,canPublishData:true});
    return{url:env.LIVEKIT_URL,token:await token.toJwt(),roomKey};
  });

  // Check if a 1-on-1 call is still active (someone still connected to the LiveKit room).
  // A call stays joinable for as long as at least one side remains connected,
  // regardless of who initiated it or how long ago.
  app.get('/dm/:userId/call/active',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot call yourself'});
    const roomKey=`dm-${[req.user.sub,req.params.userId].sort().join('-')}`;
    const active=await isRoomActive(roomKey);
    return{active};
  });

  // Upload a voice note for a DM
  app.post('/dm/:userId/voice',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot message yourself'});
    const otherUser=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
    if(!otherUser)return reply.code(404).send({error:'User not found'});
    try{
      const{buffer,mimetype}=await readAudioFileFromRequest(req);
      const audioUrl=await processAndStoreAudio(buffer,mimetype,req.user.sub);
      const msg=await prisma.directMessage.create({data:{senderId:req.user.sub,recipientId:req.params.userId,body:'',audioUrl}});
      const senderProfile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});
      notifyUser(req.params.userId,'CHAT','New voice note',`${senderProfile?.fullName||'Someone'} sent you a voice note.`,'/dashboard/alumni').catch(()=>{});
      return msg;
    }catch(err:any){return reply.code(400).send({error:err.message});}
  });

  // Send a "Buzz" (attention-getting nudge) — rate limited to 1 per 20s per pair
  app.post('/dm/:userId/buzz',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(req.params.userId===req.user.sub)return reply.code(400).send({error:'Cannot buzz yourself'});
    const otherUser=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
    if(!otherUser)return reply.code(404).send({error:'User not found'});
    const recent=await prisma.directMessage.findFirst({where:{senderId:req.user.sub,recipientId:req.params.userId,isBuzz:true,createdAt:{gte:new Date(Date.now()-20_000)}},orderBy:{createdAt:'desc'}});
    if(recent)return reply.code(429).send({error:'Wait a moment before buzzing again'});
    const msg=await prisma.directMessage.create({data:{senderId:req.user.sub,recipientId:req.params.userId,body:'🔔 sent you a buzz!',isBuzz:true}});
    const senderProfile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});
    notifyUser(req.params.userId,'CHAT','🔔 Buzz!',`${senderProfile?.fullName||'Someone'} buzzed you!`,'/dashboard/alumni').catch(()=>{});
    return msg;
  });

  app.patch('/profile',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({fullName:z.string().min(2).optional(),nickname:z.string().optional(),gender:z.enum(['MALE','FEMALE']).optional(),graduationYear:z.number().int().min(1960).max(2030).optional(),house:z.string().optional(),className:z.string().optional(),positionHeld:z.string().optional(),country:z.string().optional(),city:z.string().optional(),profession:z.string().optional(),bio:z.string().max(1000).optional(),avatarUrl:z.union([z.string().url(),z.string().regex(/^data:image\//)]).optional(),coverUrl:z.union([z.string().url(),z.string().regex(/^data:image\//)]).optional(),searchable:z.boolean().optional()}).parse(req.body);return prisma.alumniProfile.update({where:{userId:req.user.sub},data:b});});

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
      return reply.code(500).send({error:'Failed to process image'});
    }
  });

  app.post('/profile/cover',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    try {
      const { buffer, mimetype } = await readFileFromRequest(req);
      const coverUrl = await processAndStoreImage(buffer, mimetype, `cover-${req.user.sub}-${randomUUID()}`, 'covers', 1200, 400);
      await prisma.alumniProfile.update({where:{userId:req.user.sub},data:{coverUrl}});
      return{coverUrl};
    } catch(err:any) {
      if (err.message.includes('No file') || err.message.includes('Only') || err.message.includes('under 5MB')) return reply.code(400).send({error:err.message});
      return reply.code(500).send({error:'Failed to process image'});
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
  app.post('/chat/rooms',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({name:z.string().min(2).max(100),yearGroupId:z.string().optional(),isAssemblyHall:z.boolean().default(false),imageUrl:z.string().optional()}).parse(req.body);if(b.isAssemblyHall&&!['ADMIN','SUPER_ADMIN'].includes(req.user.role))return{error:'Only admins can create assembly halls'}as any;return prisma.chatRoom.create({data:{...b,isAssemblyHall:b.isAssemblyHall&&['ADMIN','SUPER_ADMIN'].includes(req.user.role)?true:false}})});
  app.post('/chat/rooms/:id/image',{preHandler:[app.authenticate]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,req.params.id,'chatrooms',200,200);await prisma.chatRoom.update({where:{id:req.params.id},data:{imageUrl}});return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  app.get('/chat/rooms/:id/messages',{preHandler:[app.authenticate]},async(req:any)=>{const q=z.object({cursor:z.string().optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).parse(req.query);return prisma.message.findMany({where:{roomId:req.params.id},orderBy:{createdAt:'desc'},take:q.limit,...(q.cursor?{skip:1,cursor:{id:q.cursor}}:{}) ,include:{user:{select:{id:true,profile:{select:{fullName:true,avatarUrl:true}}}},replyTo:{select:{id:true,body:true,userId:true,audioUrl:true,imageUrl:true,videoUrl:true,user:{select:{profile:{select:{fullName:true}}}}}}}})});
  app.post('/chat/rooms/:id/messages',{preHandler:[app.authenticate]},async(req:any)=>{const b=z.object({body:z.string().max(4000),replyToId:z.string().optional(),audioUrl:z.string().optional(),imageUrl:z.string().optional(),videoUrl:z.string().optional()}).parse(req.body);const hasMedia=b.audioUrl||b.imageUrl||b.videoUrl;if(!b.body.trim()&&!hasMedia)return{error:'Message cannot be empty'}as any;const msg=await prisma.message.create({data:{roomId:req.params.id,userId:req.user.sub,body:b.body||'',...(b.replyToId?{replyToId:b.replyToId}:{}),...(b.audioUrl?{audioUrl:b.audioUrl}:{}),...(b.imageUrl?{imageUrl:b.imageUrl}:{}),...(b.videoUrl?{videoUrl:b.videoUrl}:{})},include:{user:{select:{profile:{select:{fullName:true}}}}}});const room=await prisma.chatRoom.findUnique({where:{id:req.params.id},include:{yearGroup:true}});if(room){const senderName=msg.user?.profile?.fullName||'A member';const link=room.yearGroupId?`/dashboard/groups/${room.yearGroupId}?tab=chat`:`/dashboard/assembly`;const preview=b.audioUrl?'🎤 Voice note':b.imageUrl?'📷 Photo':b.videoUrl?'🎥 Video':b.body.slice(0,100);if(room.yearGroupId){notifyYearGroup(room.yearGroupId,'CHAT',`New message in ${room.name}`,`${senderName}: ${preview}`,link,req.user.sub).catch(()=>{});}else{notifyAllUsers('CHAT',`New message in ${room.name}`,`${senderName}: ${preview}`,link,req.user.sub).catch(()=>{});}}return msg;});
  // Upload voice note for group chat
  app.post('/chat/rooms/:id/voice',{preHandler:[app.authenticate]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readAudioFileFromRequest(req);const audioUrl=await processAndStoreAudio(buffer,mimetype,`${req.params.id}-${randomUUID()}`);return{audioUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  // Upload image for group chat message
  app.post('/chat/rooms/:id/upload-image',{preHandler:[app.authenticate]},async(req:any,reply)=>{try{const{buffer,mimetype}=await readFileFromRequest(req);const imageUrl=await processAndStoreImage(buffer,mimetype,`${req.params.id}-${randomUUID()}`,'chat-images',800,800);return{imageUrl};}catch(err:any){return reply.code(400).send({error:err.message});}});
  // Upload video for group chat
  app.post('/chat/rooms/:id/video',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    try{
      const file=await req.file();if(!file)throw new Error('No file uploaded');
      const ALLOWED_VIDEO_MIME=new Set(['video/webm','video/mp4','video/quicktime','video/ogg']);
      if(!ALLOWED_VIDEO_MIME.has(file.mimetype))throw new Error('Unsupported video format (use MP4, WebM, or MOV)');
      const chunks:Buffer[]=[];for await(const chunk of file.file){chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));}
      const buffer=Buffer.concat(chunks);if(buffer.length>50_000_000)throw new Error('Video must be under 50MB');
      if(CLOUDINARY_CONFIGURED){try{const cloudinary=await import('cloudinary');const cloud=cloudinary.v2;cloud.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET});const publicId=`chat-video-${req.params.id}-${randomUUID()}`;const videoUrl=await new Promise((resolve,reject)=>{const stream=cloud.uploader.upload_stream({public_id:publicId,folder:'opass-chat-videos',resource_type:'video'},(err,result)=>{if(err)reject(err);else resolve(result!.secure_url);});stream.end(buffer);});return{videoUrl};}catch{}}
      return reply.code(400).send({error:'Video upload requires Cloudinary configuration'});
    }catch(err:any){return reply.code(400).send({error:err.message});}
  });
  // Typing indicator — in-memory map (room → userId → timestamp)
  const typingMap=new Map<string,Map<string,number>>();
  app.post('/chat/rooms/:id/typing',{preHandler:[app.authenticate]},async(req:any)=>{const roomId=req.params.id;const userId=req.user.sub;if(!typingMap.has(roomId))typingMap.set(roomId,new Map());typingMap.get(roomId)!.set(userId,Date.now());return{ok:true};});
  app.get('/chat/rooms/:id/typing',{preHandler:[app.authenticate]},async(req:any)=>{const roomId=req.params.id;const now=Date.now();const room=typingMap.get(roomId);if(!room)return{users:[]};const users:string[]=[];for(const[userId,ts]of room){if(now-ts<4000&&userId!==req.user.sub){users.push(userId);}else if(now-ts>=4000){room.delete(userId);}}return{users};});
  // Toggle a reaction on a message
  app.post('/chat/rooms/:id/messages/:msgId/react',{preHandler:[app.authenticate]},async(req:any,reply:any)=>{
    const b=z.object({emoji:z.string().min(1).max(10)}).parse(req.body);
    const msg=await prisma.message.findUnique({where:{id:req.params.msgId}});
    if(!msg||msg.roomId!==req.params.id)return reply.code(404).send({error:'Message not found'});
    const reactions=(msg.reactions as Record<string,string[]>)||{};
    const emoji=b.emoji;
    const userId=req.user.sub;
    if(!reactions[emoji])reactions[emoji]=[userId];
    else if(reactions[emoji].includes(userId))reactions[emoji]=reactions[emoji].filter((u:string)=>u!==userId);
    else reactions[emoji]=[...reactions[emoji],userId];
    if(reactions[emoji].length===0)delete reactions[emoji];
    const updated=await prisma.message.update({where:{id:msg.id},data:{reactions:reactions as any},select:{id:true,reactions:true}});
    return updated;
  });

  // Auto-create or find a chat room for a year group
  app.get('/year-groups/:id/chat-room',{preHandler:[app.authenticate]},async(req:any,reply:any)=>{
    const yg=await prisma.yearGroup.findUnique({where:{id:req.params.id}});
    if(!yg)return reply.code(404).send({error:'Year group not found'});
    let room=await prisma.chatRoom.findFirst({where:{yearGroupId:yg.id}});
    if(!room){
      room=await prisma.chatRoom.create({data:{name:`${yg.name} Chat`,yearGroupId:yg.id}});
    }
    return room;
  });

  // Start a group call (audio/video) via LiveKit
  app.post('/chat/rooms/:id/call',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(!env.LIVEKIT_API_KEY||!env.LIVEKIT_API_SECRET||!env.LIVEKIT_URL)return reply.code(503).send({error:'Live provider not configured'});
    const b=z.object({type:z.enum(['audio','video'])}).parse(req.body);
    const room=await prisma.chatRoom.findUnique({where:{id:req.params.id},include:{yearGroup:true}});
    if(!room)return reply.code(404).send({error:'Chat room not found'});
    const roomKey=`group-${room.id}`;
    const profile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});
    const callerName=profile?.fullName||'Someone';
    const token=new AccessToken(env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET,{identity:req.user.sub,name:callerName,metadata:JSON.stringify({callType:b.type,groupId:room.yearGroupId||''})});
    token.addGrant({room:roomKey,roomJoin:true,canPublish:true,canSubscribe:true});
    // Log the call as a chat message so others can see and join
    await prisma.message.create({data:{roomId:room.id,userId:req.user.sub,body:`📞 Group ${b.type} call started by ${callerName}`}});
    // Notify group members
    if(room.yearGroupId){notifyYearGroup(room.yearGroupId,'CHAT',`Group ${b.type} call`,`${callerName} started a ${b.type} call in ${room.name}.`,room.yearGroupId?`/dashboard/groups/${room.yearGroupId}?tab=chat`:'/dashboard/assembly',req.user.sub).catch(()=>{});}
    return{url:env.LIVEKIT_URL,token:await token.toJwt(),roomKey,type:b.type};
  });

  // Join a group call
  app.post('/chat/rooms/:id/call/join',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    if(!env.LIVEKIT_API_KEY||!env.LIVEKIT_API_SECRET||!env.LIVEKIT_URL)return reply.code(503).send({error:'Live provider not configured'});
    const room=await prisma.chatRoom.findUnique({where:{id:req.params.id}});
    if(!room)return reply.code(404).send({error:'Chat room not found'});
    const roomKey=`group-${room.id}`;
    const profile=await prisma.alumniProfile.findUnique({where:{userId:req.user.sub},select:{fullName:true}});
    const token=new AccessToken(env.LIVEKIT_API_KEY,env.LIVEKIT_API_SECRET,{identity:req.user.sub,name:profile?.fullName||'Member'});
    token.addGrant({room:roomKey,roomJoin:true,canPublish:true,canSubscribe:true});
    return{url:env.LIVEKIT_URL,token:await token.toJwt(),roomKey};
  });
  // Check if a group call is active. A call stays "active" and joinable by
  // anyone for as long as at least one participant remains connected to the
  // LiveKit room — independent of who started it or how long ago that was.
  app.get('/chat/rooms/:id/call/active',{preHandler:[app.authenticate]},async(req:any)=>{
    const roomKey=`group-${req.params.id}`;
    const active=await isRoomActive(roomKey);
    if(!active)return{active:false,callMsg:null};
    // Use the most recent call-start message just to know the call type for the join banner.
    const recentCall=await prisma.message.findFirst({where:{roomId:req.params.id,body:{startsWith:'📞 Group'}},orderBy:{createdAt:'desc'}});
    return{active:true,callMsg:recentCall?{id:recentCall.id,type:recentCall.body.includes('video')?'video':'audio',createdAt:recentCall.createdAt}:{id:'',type:'audio',createdAt:new Date()}};
  });

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
  app.get('/admin/year-group-invites',{preHandler:[app.authenticate,requireRoles('ADMIN','SUPER_ADMIN')]},async(req:any)=>{const q=z.object({status:z.string().optional()}).parse(req.query);const invites=await prisma.yearGroupInvite.findMany({where:q.status?{status:q.status as any}:{status:'PENDING'},orderBy:{createdAt:'desc'},include:{yearGroup:{select:{year:true,name:true}},invitedUser:{select:{email:true,profile:{select:{fullName:true,avatarUrl:true,graduationYear:true}}}},invitedBy:{select:{email:true,profile:{select:{fullName:true}}}}}});return invites.map(({token,...i})=>({...i,awaitingRegistration:!i.invitedUserId}));});

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
