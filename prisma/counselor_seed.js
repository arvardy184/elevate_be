
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');

async function seedCounselors() {
  try {
    console.log('🌱 Seeding counselors...');

    // Create counselor users first
    const counselorUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'dr.sarah@counseling.com' },
        update: {},
        create: {
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          email: 'dr.sarah@counseling.com',
          password: await bcrypt.hash('password123', 10),
          role: 'CONSULTANT',
          profilePicture: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300'
        }
      }),
      prisma.user.upsert({
        where: { email: 'dr.michael@counseling.com' },
        update: {},
        create: {
          firstName: 'Dr. Michael',
          lastName: 'Chen',
          email: 'dr.michael@counseling.com',
          password: await bcrypt.hash('password123', 10),
          role: 'CONSULTANT',
          profilePicture: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'
        }
      }),
      prisma.user.upsert({
        where: { email: 'dr.lisa@counseling.com' },
        update: {},
        create: {
          firstName: 'Dr. Lisa',
          lastName: 'Anderson',
          email: 'dr.lisa@counseling.com',
          password: await bcrypt.hash('password123', 10),
          role: 'CONSULTANT',
          profilePicture: 'https://images.unsplash.com/photo-1594824954843-2ca9c0a36f3e?w=300'
        }
      }),
      prisma.user.upsert({
        where: { email: 'dr.ahmad@counseling.com' },
        update: {},
        create: {
          firstName: 'Dr. Arvan',
          lastName: 'Ardana',
          email: 'dr.ahmad@counseling.com',
          password: await bcrypt.hash('password123', 10),
          role: 'CONSULTANT',
          profilePicture: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300'
        }
      }),
      prisma.user.upsert({
        where: { email: 'dr.maya@counseling.com' },
        update: {},
        create: {
          firstName: 'Dr. Maya',
          lastName: 'Sari',
          email: 'dr.maya@counseling.com',
          password: await bcrypt.hash('password123', 10),
          role: 'CONSULTANT',
          profilePicture: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300'
        }
      })
    ]);

    // Create counselor profiles
    const counselors = await Promise.all([
      prisma.counselor.upsert({
        where: { userId: counselorUsers[0].id },
        update: {},
        create: {
          userId: counselorUsers[0].id,
          specialization: 'clinical-psychology',
          bio: 'Spesialis psikologi klinis dengan pengalaman 8+ tahun menangani kecemasan, depresi, dan trauma. Lulusan S2 Psikologi Klinis UI.',
          verified: true
        }
      }),
      prisma.counselor.upsert({
        where: { userId: counselorUsers[1].id },
        update: {},
        create: {
          userId: counselorUsers[1].id,
          specialization: 'career-counseling',
          bio: 'Konselor karir berpengalaman 10+ tahun membantu profesional menemukan jalur karir yang tepat. Certified Career Development Facilitator.',
          verified: true
        }
      }),
      prisma.counselor.upsert({
        where: { userId: counselorUsers[2].id },
        update: {},
        create: {
          userId: counselorUsers[2].id,
          specialization: 'relationship-therapy',
          bio: 'Terapis hubungan dan keluarga dengan pengalaman 6+ tahun. Spesialisasi dalam konflik hubungan dan komunikasi interpersonal.',
          verified: true
        }
      }),
      prisma.counselor.upsert({
        where: { userId: counselorUsers[3].id },
        update: {},
        create: {
          userId: counselorUsers[3].id,
          specialization: 'psychiatry',
          bio: 'Psikiater dengan pengalaman 12+ tahun menangani gangguan mental. Lulusan FK UI dan spesialis Psikiatri RSCM.',
          verified: true
        }
      }),
      prisma.counselor.upsert({
        where: { userId: counselorUsers[4].id },
        update: {},
        create: {
          userId: counselorUsers[4].id,
          specialization: 'stress-management',
          bio: 'Psikolog dengan fokus manajemen stres dan kesehatan mental di tempat kerja. Pengalaman 5+ tahun corporate counseling.',
          verified: false // This one is not verified yet
        }
      })
    ]);

    console.log('✅ Counselors seeded successfully!');
    console.log(`Created ${counselors.length} counselors`);
    
    // Show created counselors
    counselors.forEach((counselor, index) => {
      const fullName = `${counselorUsers[index].firstName} ${counselorUsers[index].lastName}`;
      console.log(`${index + 1}. ${fullName} - ${counselor.specialization} (${counselor.verified ? 'Verified' : 'Not Verified'})`);
    });

  } catch (error) {
    console.error('❌ Error seeding counselors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedCounselors();
}

module.exports = { seedCounselors }; 