import { PrismaClient, UserRole, CaseStatus, AlertSeverity, AlertStatus, Denomination } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SentinelX databases...');

  // 1. Clean existing records
  await prisma.geoEvent.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.evidencePackage.deleteMany({});
  await prisma.citizenReport.deleteMany({});
  await prisma.currencyReport.deleteMany({});
  await prisma.scamSession.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@sentinelx.gov.in',
      name: 'Aditya Vardhan (Admin)',
      password: passwordHash,
      role: UserRole.ADMIN,
      phone: '+919999999999',
    },
  });

  const officer = await prisma.user.create({
    data: {
      email: 'officer@sentinelx.gov.in',
      name: 'Inspector Rajesh Kumar',
      password: passwordHash,
      role: UserRole.OFFICER,
      phone: '+919876543210',
    },
  });

  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@sentinelx.gov.in',
      name: 'Dr. Meera Sen (Analyst)',
      password: passwordHash,
      role: UserRole.ANALYST,
      phone: '+919123456789',
    },
  });

  const citizen = await prisma.user.create({
    data: {
      email: 'citizen@gmail.com',
      name: 'Rajesh Sharma (Citizen)',
      password: passwordHash,
      role: UserRole.CITIZEN,
      phone: '+919811223344',
    },
  });

  console.log('Users seeded successfully.');

  // 3. Create Case & Relations
  const mockCase = await prisma.case.create({
    data: {
      caseNumber: 'SX-2026-0041',
      title: 'Digital Arrest Scam Call - Gang ID 109',
      description: 'Coercive calls spoofing CBI officials to extract funds via mule account routes.',
      status: CaseStatus.UNDER_INVESTIGATION,
      officerId: officer.id,
    },
  });

  // 4. Create Alert
  await prisma.alert.create({
    data: {
      caseId: mockCase.id,
      title: 'Voice Deepfake Alert',
      message: 'Active synthetic signature match detected on call stream corresponding to Gang ID 109.',
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.ACTIVE,
      metadata: {
        caller: '+919876500112',
        matchedCloningEngine: 'ElevenLabsClone',
      },
    },
  });

  // 5. Create ScamSession
  await prisma.scamSession.create({
    data: {
      caseId: mockCase.id,
      phoneNumber: '+919876500112',
      transcript: 'You are under digital arrest. Do not leave the camera. We found narcotics in your package shipped to Cambodia. You must verify your funds by sending them to our safety locker account.',
      scamScore: 0.94,
      deepfakeScore: 0.88,
      impersonation: 'CBI Officer K. Raghavan',
      isActive: false,
    },
  });

  // 6. Create Counterfeit Currency Report
  await prisma.currencyReport.create({
    data: {
      caseId: mockCase.id,
      denomination: Denomination.INR_500,
      serialNumber: '5AC982341',
      confidence: 0.99,
      isCounterfeit: true,
      latitude: 18.9750,
      longitude: 72.8258,
    },
  });

  // 7. Create Citizen Report
  await prisma.citizenReport.create({
    data: {
      citizenId: citizen.id,
      caseId: mockCase.id,
      reporterName: 'Rajesh Sharma',
      reporterPhone: '+919811223344',
      incidentDetail: 'Received a video call on WhatsApp from a person in a police uniform claiming my bank account was linked to international laundering. They demanded my financial details.',
      incidentDate: new Date(),
      location: 'Mumbai, Maharashtra',
      riskLevel: 'HIGH',
    },
  });

  // 8. Create GeoEvents (Geospatial Intelligence Heatmap Seeds)
  const hotspots = [
    { type: 'DIGITAL_ARREST', lat: 19.0760, lng: 72.8777, score: 0.92, desc: 'Digital Arrest Call Centroid - Bandra East' },
    { type: 'COUNTERFEIT', lat: 18.9220, lng: 72.8347, score: 0.85, desc: 'Counterfeit Note scan point - Colaba Retailer' },
    { type: 'FRAUD_NETWORK', lat: 19.2183, lng: 72.9781, score: 0.97, desc: 'Suspicious Cash Out ATM - Thane' },
    { type: 'DIGITAL_ARREST', lat: 28.6139, lng: 77.2090, score: 0.89, desc: 'ED Impersonation Threat Alert - Connaught Place' },
    { type: 'COUNTERFEIT', lat: 28.5355, lng: 77.3910, score: 0.94, desc: 'Counterfeit distribution node - Noida Sector 62' },
    { type: 'FRAUD_NETWORK', lat: 22.5726, lng: 88.3639, score: 0.98, desc: 'Mule bank registration address - Salt Lake Sec V' },
    { type: 'DIGITAL_ARREST', lat: 12.9716, lng: 77.5946, score: 0.76, desc: 'Customs Officer Impersonation scam - Bengaluru' },
  ];

  for (const h of hotspots) {
    await prisma.geoEvent.create({
      data: {
        incidentType: h.type,
        latitude: h.lat,
        longitude: h.lng,
        riskScore: h.score,
        description: h.desc,
      },
    });
  }

  // 9. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      description: 'SentinelX V7 Hackathon MVP seeded successfully with reference mock logs.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('SentinelX database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
