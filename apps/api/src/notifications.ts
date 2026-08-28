import { prisma, NotificationType } from '@opass/db';

/**
 * Create a notification for a specific user.
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, body, link },
  });
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
) {
  const users = await prisma.user.findMany({
    where: excludeUserId ? { id: { not: excludeUserId } } : undefined,
    select: { id: true },
  });
  if (users.length === 0) return [];
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
) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });
  if (admins.length === 0) return [];
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
) {
  const memberships = await prisma.yearGroupMembership.findMany({
    where: { yearGroupId },
    select: { userId: true },
  });
  if (memberships.length === 0) return [];
  return prisma.notification.createMany({
    data: memberships.map(m => ({ userId: m.userId, type, title, body, link })),
  });
}
