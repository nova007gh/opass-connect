import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from './config.js';
import { prisma } from '@opass/db';

export function registerPaymentRoutes(app:FastifyInstance){
  app.post('/payments/initialize',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const body=z.object({amount:z.number().positive(),purpose:z.string().min(2),currency:z.string().default('GHS')}).parse(req.body);
    const reference=`OPASS-${crypto.randomUUID()}`;
    const payment=await prisma.payment.create({data:{userId:req.user.sub,purpose:body.purpose,reference,provider:env.PAYMENT_PROVIDER,currency:body.currency,amount:body.amount}});
    if(env.PAYMENT_PROVIDER==='paystack' && env.PAYSTACK_SECRET_KEY){
      const me=await prisma.user.findUnique({where:{id:req.user.sub}});
      const r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({email:me?.email,amount:Math.round(body.amount*100),currency:body.currency,reference})});
      const data:any=await r.json();
      if(!r.ok) return reply.code(502).send({error:'Payment provider initialization failed'});
      return {paymentId:payment.id,reference,authorizationUrl:data.data.authorization_url};
    }
    return {paymentId:payment.id,reference,authorizationUrl:null,notice:'Payment provider credentials are not configured.'};
  });

  app.post('/payments/verify/:reference',{preHandler:[app.authenticate]},async(req:any,reply)=>{
    const payment=await prisma.payment.findUnique({where:{reference:req.params.reference}});
    if(!payment || payment.userId!==req.user.sub) return reply.code(404).send({error:'Payment not found'});
    if(payment.provider==='paystack' && env.PAYSTACK_SECRET_KEY){
      const r=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.reference)}`,{headers:{Authorization:`Bearer ${env.PAYSTACK_SECRET_KEY}`}});
      const data:any=await r.json();
      const paid=r.ok && data?.data?.status==='success' && Number(data.data.amount)===Math.round(Number(payment.amount)*100);
      const updated=await prisma.payment.update({where:{id:payment.id},data:{status:paid?'PAID':'FAILED',providerPayload:data}});
      return {verified:paid,payment:updated};
    }
    return reply.code(503).send({error:'Payment verification provider not configured'});
  });
}
