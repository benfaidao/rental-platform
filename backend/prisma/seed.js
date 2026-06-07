require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rental.ma';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    console.log('Admin already exists');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
