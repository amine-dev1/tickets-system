/// <reference path="./types/express.d.ts" />
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import ticketRouter from './routes/tickets';
import commentRouter from './routes/comments';
import adminRouter from './routes/admin';
import prestatairesRouter from './routes/prestataires';
import companiesRouter from './routes/companies';
import missionsRouter from './routes/missions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter for general routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

import { isMock, loadData, saveData } from './lib/supabase';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (isMock) {
  app.post('/api/mock/profiles', (req, res) => {
    const profile = req.body;
    const profiles = loadData('profiles');
    
    // If user registered with a company name, auto-create company & set as company_admin
    if (profile.company && !profile.company_id) {
      const companies = loadData('companies') || [];
      let company = companies.find((c: any) => c.name.toLowerCase() === profile.company.toLowerCase());
      if (!company) {
        const companyId = 'c_' + Math.random().toString(36).substring(2, 10);
        company = {
          id: companyId,
          name: profile.company,
          slug: profile.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          contact_email: profile.email,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        companies.push(company);
        saveData('companies', companies);
      }
      profile.company_id = company.id;
      profile.role = 'client';
    }

    const idx = profiles.findIndex((p: any) => p.id === profile.id);
    if (idx >= 0) profiles[idx] = { ...profiles[idx], ...profile };
    else profiles.push(profile);
    saveData('profiles', profiles);
    res.json({ success: true });
  });

  app.get('/api/mock/profiles', (req, res) => {
    const profiles = loadData('profiles');
    res.json(profiles);
  });
}

// Routes
app.use('/api/companies', companiesRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/prestataires', prestatairesRouter);
app.use('/api/missions', missionsRouter);
app.use('/api', commentRouter); // comments handles both ticket-based sub-routes & single comments
app.use('/api/admin', adminRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`🚀 TicketFlow server is running at http://localhost:${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
});
