import { prisma, NotificationType } from '@opass/db';
import { sendEmailToUser } from './email.js';

/**
 * Create a notification for a specific user (with optional email).
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  sendEmail = false,
) {
  const notif = prisma.notification.create({
    data: { userId, type, title, body, link },
  });
  if (sendEmail) {
    sendEmailToUser(userId, title, title, body, link).catch(() => {});
  }
  return notif;
}

/**
 * Create a notification for all users (broadcast).
 * Admins get all notifications. Members get relevant ones.
 */
export async function notifyAllUsers(
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  excludeUserId?: string,
  sendEmail = false,
) {
  const users = await prisma.user.findMany({
    where: excludeUserId ? { id: { not: excludeUserId } } : undefined,
    select: { id: true },
  });
  if (users.length === 0) return [];
  if (sendEmail) {
    users.forEach(u => sendEmailToUser(u.id, title, title, body, link).catch(() => {}));
  }
  return prisma.notification.createMany({
    data: users.map(u => ({ userId: u.id, type, title, body, link })),
  });
}

/**
 * Create a notification for all admins.
 */
export async function notifyAdmins(
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  sendEmail = false,
) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });
  if (admins.length === 0) return [];
  if (sendEmail) {
    admins.forEach(a => sendEmailToUser(a.id, title, title, body, link).catch(() => {}));
  }
  return prisma.notification.createMany({
    data: admins.map(a => ({ userId: a.id, type, title, body, link })),
  });
}

/**
 * Create a notification for members of a specific year group.
 */
export async function notifyYearGroup(
  yearGroupId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  sendEmail = false,
) {
  const memberships = await prisma.yearGroupMembership.findMany({
    where: { yearGroupId },
    select: { userId: true },
  });
  if (memberships.length === 0) return [];
  if (sendEmail) {
    memberships.forEach(m => sendEmailToUser(m.userId, title, title, body, link).catch(() => {}));
  }
  return prisma.notification.createMany({
    data: memberships.map(m => ({ userId: m.userId, type, title, body, link })),
  });
}
