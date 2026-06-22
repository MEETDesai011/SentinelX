import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from './middleware/logger';
import { authenticate, authorize, AuthenticatedRequest } from './middleware/auth';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2026';

// Middleware configs
app.use(cors());
app.use(express.json());

// Correlation ID Middleware
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// Logger logging HTTP requests
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  logger.info(`HTTP ${req.method} ${req.url}`, { correlationId: req.correlationId });
  next();
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------

app.post('/api/v1/auth/register', async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, name, role, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role && Object.values(UserRole).includes(role) ? role : UserRole.CITIZEN;

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: userRole,
        phone,
      },
    });

    logger.info(`User registered: ${user.email} (${user.role})`, { correlationId: req.correlationId });
    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    logger.error(`Registration error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

app.post('/api/v1/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info(`User logged in successfully: ${user.email}`, { correlationId: req.correlationId });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error(`Login error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ----------------------------------------------------
// HOOKS WITH SERVICES
// ----------------------------------------------------

// Scam service analyzing call metadata/transcripts
app.post('/api/v1/scam/analyse', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.SCAM_SERVICE_URL || 'http://localhost:8001'}/sessions/analyse`;
    const response = await axios.post(url, req.body, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway scam analysis dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Scam service unreachable' });
  }
});

// Counterfeit scan note validation
app.post('/api/v1/currency/scan', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.COUNTERFEIT_SERVICE_URL || 'http://localhost:8006'}/currency/detect`;
    const response = await axios.post(url, req.body, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway counterfeit check dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Counterfeit service unreachable' });
  }
});

// Fraud graph transaction analysis
app.post('/api/v1/graph/analyse', authenticate, authorize([UserRole.OFFICER, UserRole.ANALYST, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.FRAUD_GRAPH_URL || 'http://localhost:8002'}/graph/analyse`;
    const response = await axios.post(url, req.body, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway fraud graph dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Fraud graph service unreachable' });
  }
});

// Citizen Shield assessment
app.post('/api/v1/citizen/assess', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.CITIZEN_SHIELD_URL || 'http://localhost:8003'}/citizen/assess`;
    const response = await axios.post(url, req.body, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway citizen assessment dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Citizen Shield service unreachable' });
  }
});

// ----------------------------------------------------
// GEOSPATIAL INTELLIGENCE ENDPOINTS (PILLAR 4 MVP)
// ----------------------------------------------------

app.get('/api/v1/geo/hotspots', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.THREAT_FUSION_URL || 'http://localhost:8004'}/geo/hotspots`;
    const response = await axios.get(url, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway geo hotspots dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Threat Fusion service unreachable' });
  }
});

app.post('/api/v1/geo/events', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.THREAT_FUSION_URL || 'http://localhost:8004'}/geo/events`;
    const response = await axios.post(url, req.body, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway geo event dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Threat Fusion service unreachable' });
  }
});

// ----------------------------------------------------
// EVIDENCE ENDPOINT
// ----------------------------------------------------

app.post('/api/v1/evidence/package', authenticate, authorize([UserRole.OFFICER, UserRole.ANALYST, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = `${process.env.EVIDENCE_SERVICE_URL || 'http://localhost:8005'}/evidence/package`;
    const response = await axios.post(url, req.body, {
      headers: { 'x-correlation-id': req.correlationId },
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error(`Gateway evidence package dispatch error: ${(err as Error).message}`, { correlationId: req.correlationId });
    return res.status(502).json({ error: 'Bad Gateway: Evidence service unreachable' });
  }
});

// ----------------------------------------------------
// CORE LOCAL DATABASE FETCHES FOR OFFICER DASHBOARD
// ----------------------------------------------------

app.get('/api/v1/cases', authenticate, authorize([UserRole.OFFICER, UserRole.ANALYST, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      where: { deletedAt: null },
      include: { alerts: true, scamSessions: true, currencyReports: true },
    });
    return res.json(cases);
  } catch (err) {
    return res.status(500).json({ error: 'Database fetch failed' });
  }
});

app.get('/api/v1/alerts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(alerts);
  } catch (err) {
    return res.status(500).json({ error: 'Database fetch failed' });
  }
});

app.get('/api/v1/reports', authenticate, authorize([UserRole.OFFICER, UserRole.ANALYST, UserRole.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = await prisma.citizenReport.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(reports);
  } catch (err) {
    return res.status(500).json({ error: 'Database fetch failed' });
  }
});

app.post('/api/v1/reports', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { reporterName, reporterPhone, incidentDetail, incidentDate, location } = req.body;
  if (!reporterName || !reporterPhone || !incidentDetail || !incidentDate) {
    return res.status(400).json({ error: 'Missing reporting parameters' });
  }
  try {
    const report = await prisma.citizenReport.create({
      data: {
        citizenId: req.user?.role === UserRole.CITIZEN ? req.user.id : null,
        reporterName,
        reporterPhone,
        incidentDetail,
        incidentDate: new Date(incidentDate),
        location,
        riskLevel: 'MEDIUM',
      },
    });
    return res.status(201).json(report);
  } catch (err) {
    return res.status(500).json({ error: 'Report creation failed' });
  }
});

// App Health
app.get('/health', (req, res) => {
  return res.json({ status: 'UP', service: 'sentinelx-api-gateway' });
});

// Start Server
app.listen(PORT, () => {
  logger.info(`SentinelX API Gateway listening on port ${PORT}`);
});
