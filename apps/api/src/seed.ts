import { prisma, UserRole, VerificationStatus, ElectionStatus, ProjectStatus } from '@opass/db';
import bcrypt from 'bcryptjs';

export async function runSeedIfNeeded() {
  const userCount = await prisma.user.count();
  if (userCount > 0) return;

  console.log('[seed] No users found — running initial seed...');
  const passwordHash = await bcrypt.hash('opassadmin2026', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@opassconnect.edu.gh' },
    update: {},
    create: {
      email: 'admin@opassconnect.edu.gh',
      phone: '+233000000000',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      verification: VerificationStatus.VERIFIED,
      profile: { create: { fullName: 'OPASS Admin', graduationYear: 2000, house: 'Admin', profession: 'Administrator', country: 'Ghana', city: 'Kumasi' } },
    },
    include: { profile: true },
  });
  console.log('[seed] Admin:', admin.email);

  const yg2006 = await prisma.yearGroup.upsert({ where: { year: 2006 }, update: {}, create: { year: 2006, name: 'Class of 2006', description: 'Ofori Panin Senior High School Class of 2006' } });
  const yg2010 = await prisma.yearGroup.upsert({ where: { year: 2010 }, update: {}, create: { year: 2010, name: 'Class of 2010', description: 'Ofori Panin Senior High School Class of 2010' } });
  const yg2015 = await prisma.yearGroup.upsert({ where: { year: 2015 }, update: {}, create: { year: 2015, name: 'Class of 2015', description: 'Ofori Panin Senior High School Class of 2015' } });

  const memberPass = await bcrypt.hash('opassmember2026', 12);
  const alumniData = [
    { email: 'kwame.mensah@gmail.com', fullName: 'Kwame Mensah', year: 2006, house: 'Opoku Ware', profession: 'Software Engineer', country: 'Ghana', city: 'Accra', phone: '+233241112233' },
    { email: 'ama.osei@yahoo.com', fullName: 'Ama Osei', year: 2006, house: 'Agyeman', profession: 'Medical Doctor', country: 'Ghana', city: 'Kumasi', phone: '+233244445556' },
    { email: 'kojo.asante@hotmail.com', fullName: 'Kojo Asante', year: 2010, house: 'Opoku Ware', profession: 'Architect', country: 'Ghana', city: 'Takoradi', phone: '+233277778889' },
    { email: 'adwoa.baah@gmail.com', fullName: 'Adwoa Baah', year: 2010, house: 'Agyeman', profession: 'Lawyer', country: 'Ghana', city: 'Accra', phone: '+233201234567' },
    { email: 'yaw.boateng@gmail.com', fullName: 'Yaw Boateng', year: 2015, house: 'Sarpong', profession: 'Accountant', country: 'Ghana', city: 'Kumasi', phone: '+233249998877' },
    { email: 'efua.mensah@gmail.com', fullName: 'Efua Mensah', year: 2015, house: 'Sarpong', profession: 'Pharmacist', country: 'Ghana', city: 'Cape Coast', phone: '+233246665544' },
    { email: 'kofi.darko@outlook.com', fullName: 'Kofi Darko', year: 2006, house: 'Opoku Ware', profession: 'Civil Engineer', country: 'Ghana', city: 'Accra', phone: '+233243332221' },
    { email: 'akosua.frimpong@gmail.com', fullName: 'Akosua Frimpong', year: 2010, house: 'Agyeman', profession: 'Teacher', country: 'Ghana', city: 'Kukurantumi', phone: '+233247776655' },
  ];

  const members: any[] = [];
  for (const a of alumniData) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email, phone: a.phone, passwordHash: memberPass, role: UserRole.MEMBER, verification: VerificationStatus.VERIFIED,
        profile: { create: { fullName: a.fullName, graduationYear: a.year, house: a.house, profession: a.profession, country: a.country, city: a.city, bio: `OPASS alumni, Class of ${a.year}. ${a.profession} based in ${a.city}, ${a.country}.` } },
      },
      include: { profile: true },
    });
    members.push(user);
    const yg = a.year === 2006 ? yg2006 : a.year === 2010 ? yg2010 : yg2015;
    await prisma.yearGroupMembership.upsert({ where: { userId_yearGroupId: { userId: user.id, yearGroupId: yg.id } }, update: {}, create: { userId: user.id, yearGroupId: yg.id } });
  }
  console.log(`[seed] Created ${members.length} alumni members`);

  await prisma.event.create({ data: { title: 'OPASS Global Reunion 2026', description: 'Annual reunion for all OPASS alumni worldwide. Networking, dinner and entertainment.', startsAt: new Date('2026-12-15T10:00:00Z'), endsAt: new Date('2026-12-15T18:00:00Z'), venue: 'OPASS Campus, Kukurantumi' } }).catch(() => null);
  await prisma.event.create({ data: { title: '2006 Year Group 20th Anniversary', description: 'Celebrating 20 years since the Class of 2006 graduated from OPASS.', startsAt: new Date('2026-07-04T09:00:00Z'), endsAt: new Date('2026-07-04T17:00:00Z'), venue: 'Accra International Conference Centre', ticketPrice: 100 } }).catch(() => null);
  await prisma.event.create({ data: { title: 'OPASS Career Mentorship Webinar', description: 'Virtual mentorship session for current OPASS students.', startsAt: new Date('2026-09-20T15:00:00Z'), endsAt: new Date('2026-09-20T17:00:00Z'), streamUrl: 'https://youtube.com/live/opass-mentorship' } }).catch(() => null);

  await prisma.project.create({ data: { title: 'School Library Renovation', description: 'Help us renovate and modernize the OPASS school library for current students.', targetAmount: 50000, raisedAmount: 12500, status: ProjectStatus.ACTIVE } }).catch(() => null);
  await prisma.project.create({ data: { title: 'Science Laboratory Equipment', description: 'Purchase of modern lab equipment for the science departments.', targetAmount: 30000, raisedAmount: 28500, status: ProjectStatus.ACTIVE, yearGroupId: yg2006.id } }).catch(() => null);
  await prisma.project.create({ data: { title: 'Sports Field Upgrade', description: 'Upgrading the football field and athletics track to benefit all students.', targetAmount: 75000, raisedAmount: 75000, status: ProjectStatus.FUNDED } }).catch(() => null);

  const bizOwners = members.slice(0, 4);
  const businesses = [
    { name: 'Mensah Tech Solutions', category: 'Technology', description: 'Software development and IT consulting for businesses in Ghana.', website: 'https://mensah-tech.gh', phone: '+233241112233' },
    { name: 'Osei Medical Centre', category: 'Healthcare', description: 'Family medical practice providing quality healthcare in Kumasi.', website: 'https://osei-medical.gh', phone: '+233244445556' },
    { name: 'Asante & Associates Architecture', category: 'Architecture', description: 'Modern architectural design and project management services.', website: 'https://asante-arch.gh', phone: '+233277778889' },
    { name: 'Baah Legal Consultancy', category: 'Legal Services', description: 'Experienced legal counsel for corporate and personal matters.', phone: '+233201234567' },
  ];
  for (let i = 0; i < bizOwners.length; i++) {
    await prisma.business.create({ data: { ownerId: bizOwners[i].id, ...businesses[i], verified: true } }).catch(() => null);
  }

  const assemblyHall = await prisma.chatRoom.create({ data: { name: 'OPASS Assembly Hall', isAssemblyHall: true } }).catch(() => null);
  const class2006Room = await prisma.chatRoom.create({ data: { name: 'Class of 2006 Discussion', yearGroupId: yg2006.id } }).catch(() => null);
  await prisma.chatRoom.create({ data: { name: 'General Alumni Lounge' } }).catch(() => null);

  if (assemblyHall && members[0]) {
    await prisma.message.create({ data: { roomId: assemblyHall.id, userId: members[0].id, body: 'Akwaaba everyone! Welcome to the OPASS Assembly Hall.' } }).catch(() => null);
    await prisma.message.create({ data: { roomId: assemblyHall.id, userId: members[1].id, body: 'Great to be here! Looking forward to the reunion in December.' } }).catch(() => null);
    await prisma.message.create({ data: { roomId: assemblyHall.id, userId: admin.id, body: 'Welcome alumni! Feel free to use this space for announcements and discussions.' } }).catch(() => null);
  }
  if (class2006Room && members[0]) {
    await prisma.message.create({ data: { roomId: class2006Room.id, userId: members[0].id, body: 'Class of 2006! Our 20th anniversary is coming up in July 2026.' } }).catch(() => null);
    await prisma.message.create({ data: { roomId: class2006Room.id, userId: members[6].id, body: "I can't wait! Let's start planning." } }).catch(() => null);
  }

  const election = await prisma.election.create({ data: { title: '2006 Year Group President Election', description: 'Election for the Class of 2006 Year Group President.', yearGroupId: yg2006.id, status: ElectionStatus.OPEN, opensAt: new Date('2026-08-01T00:00:00Z'), closesAt: new Date('2026-12-31T23:59:59Z') } }).catch(() => null);
  if (election && members[0] && members[6]) {
    await prisma.candidate.create({ data: { electionId: election.id, userId: members[0].id, position: 'President', manifesto: 'I will strengthen our year group network, organize regular reunions, and support alumni businesses.' } }).catch(() => null);
    await prisma.candidate.create({ data: { electionId: election.id, userId: members[6].id, position: 'President', manifesto: 'Together we can build a stronger OPASS community. I pledge transparency and active engagement.' } }).catch(() => null);
  }

  await prisma.meeting.create({ data: { title: 'OPASS Global Town Hall', description: 'Quarterly town hall meeting for all alumni.', mode: 'WEBINAR', status: 'SCHEDULED', startsAt: new Date('2026-09-01T18:00:00Z'), capacity: 5000, roomKey: `opass-${crypto.randomUUID()}`, hostUserId: admin.id } }).catch(() => null);
  await prisma.meeting.create({ data: { title: '2006 Class Reunion Planning Call', description: 'Planning meeting for the 20th anniversary reunion.', mode: 'INTERACTIVE', status: 'SCHEDULED', startsAt: new Date('2026-06-15T19:00:00Z'), capacity: 100, roomKey: `opass-${crypto.randomUUID()}`, hostUserId: members[0]?.id || admin.id, yearGroupId: yg2006.id } }).catch(() => null);

  console.log('[seed] Seed complete!');
}
