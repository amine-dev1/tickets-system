import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin, isMock, loadData, saveData } from '../lib/supabase';
import { validate } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(2),
    company: z.string().min(1),
  }),
});

/**
 * POST /api/auth/register
 * Creates a user with email already confirmed (no verification email sent).
 */
router.post('/register', validate(registerSchema), async (req, res): Promise<void> => {
  try {
    const { email, password, full_name, company } = req.body;

    if (isMock) {
      // Mock mode: create profile directly
      const profiles = loadData('profiles');
      if (profiles.find((p: any) => p.email === email)) {
        res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });
        return;
      }
      const companies = loadData('companies') || [];
      let comp = companies.find((c: any) => c.name.toLowerCase() === company.toLowerCase());
      if (!comp) {
        const companyId = 'c_' + Math.random().toString(36).substring(2, 10);
        comp = {
          id: companyId,
          name: company,
          slug: company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          contact_email: email,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        companies.push(comp);
        saveData('companies', companies);
      }
      const id = crypto.randomUUID();
      profiles.push({ id, email, full_name, company_id: comp.id, role: 'client', avatar_url: null, created_at: new Date().toISOString() });
      saveData('profiles', profiles);
      res.status(201).json({ success: true });
      return;
    }

    // Real Supabase: create user with email pre-confirmed
    const { data: userData, error: createErr } = await (supabaseAdmin as any).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createErr) {
      const msg = createErr.message?.toLowerCase() || '';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });
      } else {
        res.status(400).json({ error: createErr.message });
      }
      return;
    }

    const userId = userData.user.id;

    // Find or create company
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .ilike('name', company)
      .single();

    let companyId: string;
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const { data: newCompany, error: compErr } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company,
          slug: company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          contact_email: email,
          is_active: true,
        })
        .select('id')
        .single();
      if (compErr || !newCompany) {
        res.status(500).json({ error: 'Erreur lors de la création de la société.' });
        return;
      }
      companyId = newCompany.id;
    }

    // Create profile
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      full_name,
      company_id: companyId,
      role: 'client',
      avatar_url: null,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
