import bcrypt from 'bcryptjs';
import {PrismaClient} from '@prisma/client';
import {loadEnv} from '../apps/api/src/env.ts';

loadEnv();
const db = new PrismaClient();

const churches = [
  'Itorero rya Mbere',
  'Itorero rya Kabiri',
  'Itorero rya Gatatu',
  'Itorero rya Kane',
  'Itorero rya Gatanu',
  'Itorero rya Gatandatu'
];

async function main() {
  const password = process.env.SEED_PASSWORD || '';
  if (password.length < 8 || password.toUpperCase().includes('CHANGE') || password === 'set-a-local-password') {
    throw new Error('Set SEED_PASSWORD in .env to a local password of at least 8 characters.');
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const created = [];
  for (const name of churches) {
    const church = await db.church.upsert({where: {name}, update: {isActive: true}, create: {name}});
    const section = await db.section.upsert({
      where: {churchId_name: {churchId: church.id, name: 'Igihande rya Mbere'}},
      update: {isActive: true},
      create: {churchId: church.id, name: 'Igihande rya Mbere'}
    });
    const group = await db.group.upsert({
      where: {sectionId_name: {sectionId: section.id, name: 'Itsinda rya Mbere'}},
      update: {isActive: true},
      create: {sectionId: section.id, name: 'Itsinda rya Mbere'}
    });
    created.push({church, section, group});
  }

  await db.user.upsert({
    where: {username: 'intara'},
    update: {passwordHash, isActive: true, role: 'REGIONAL_LEADER', fullName: "Umuyobozi w'Intara", churchId: null, sectionId: null, groupId: null},
    create: {username: 'intara', passwordHash, role: 'REGIONAL_LEADER', fullName: "Umuyobozi w'Intara"}
  });

  for (const [index, row] of created.entries()) {
    const n = index + 1;
    await db.user.upsert({
      where: {username: `itorero${n}`},
      update: {passwordHash, isActive: true, role: 'CHURCH', fullName: `Umuyobozi w'${row.church.name}`, churchId: row.church.id, sectionId: null, groupId: null},
      create: {username: `itorero${n}`, passwordHash, role: 'CHURCH', fullName: `Umuyobozi w'${row.church.name}`, churchId: row.church.id}
    });
  }

  const first = created[0];
  await db.user.upsert({
    where: {username: 'igihande1'},
    update: {passwordHash, isActive: true, role: 'SECTION', fullName: "Umuyobozi w'Igihande", churchId: first.church.id, sectionId: first.section.id, groupId: null},
    create: {username: 'igihande1', passwordHash, role: 'SECTION', fullName: "Umuyobozi w'Igihande", churchId: first.church.id, sectionId: first.section.id}
  });
  await db.user.upsert({
    where: {username: 'itsinda1'},
    update: {passwordHash, isActive: true, role: 'GROUP', fullName: "Umuyobozi w'Itsinda", churchId: first.church.id, sectionId: first.section.id, groupId: first.group.id},
    create: {username: 'itsinda1', passwordHash, role: 'GROUP', fullName: "Umuyobozi w'Itsinda", churchId: first.church.id, sectionId: first.section.id, groupId: first.group.id}
  });

  for (const name of ['Dithe', 'Ingoboka', 'Ibikorwa']) {
    await db.contributionType.upsert({where: {name}, update: {isActive: true}, create: {name}});
  }
  for (const name of ['Imikorere', 'Ibikoresho']) {
    await db.expenseType.upsert({where: {name}, update: {isActive: true}, create: {name}});
  }
  for (const name of ['Inyubako', 'Ibikoresho']) {
    await db.assetCategory.upsert({where: {name}, update: {isActive: true}, create: {name}});
  }

  const count = await db.church.count();
  if (count < 6) throw new Error(`Expected 6 churches in the central database, found ${count}.`);
  console.log(`Central PostgreSQL ready with ${count} churches.`);
  console.log('Local accounts: intara, itorero1-itorero6, igihande1, itsinda1');
  console.log('Password: value of SEED_PASSWORD');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
