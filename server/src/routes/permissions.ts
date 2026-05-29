import { Router } from 'express';
import { supabaseAdmin, isMock, loadData, saveData } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { companyScope, requireEnterpriseAdmin, DEFAULT_PERMISSIONS } from '../middleware/companyScope';
import type { UserPermissionsMap } from '../types/express';

const router = Router();

router.use(requireAuth);
router.use(companyScope);
router.use(requireEnterpriseAdmin);

// GET /api/admin/users/:id/permissions
router.get('/:id/permissions', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuper = req.userRole === 'superadmin';

    // Fetch target user's role for defaults
    let targetRole = 'client';
    if (isMock) {
      const profiles = loadData('profiles');
      const p = profiles.find((x: any) => x.id === id);
      if (!p) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
      if (!isSuper && p.company_id !== req.companyId) { res.status(403).json({ error: 'Accès refusé' }); return; }
      targetRole = p.role;

      const rows = loadData('user_permissions');
      const row = rows.find((x: any) => x.user_id === id);
      res.json({ permissions: row?.permissions ?? DEFAULT_PERMISSIONS[targetRole] ?? DEFAULT_PERMISSIONS.client, is_custom: !!row });
    } else {
      const { data: profile } = await supabaseAdmin.from('profiles').select('role, company_id').eq('id', id).single();
      if (!profile) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
      if (!isSuper && profile.company_id !== req.companyId) { res.status(403).json({ error: 'Accès refusé' }); return; }
      targetRole = profile.role;

      const { data: row } = await supabaseAdmin.from('user_permissions').select('permissions').eq('user_id', id).single();
      res.json({ permissions: row?.permissions ?? DEFAULT_PERMISSIONS[targetRole] ?? DEFAULT_PERMISSIONS.client, is_custom: !!row });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/permissions
router.put('/:id/permissions', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const permissions: UserPermissionsMap = req.body.permissions;
    if (!permissions) { res.status(400).json({ error: 'permissions requis' }); return; }

    const isSuper = req.userRole === 'superadmin';

    if (isMock) {
      const profiles = loadData('profiles');
      const p = profiles.find((x: any) => x.id === id);
      if (!p) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
      if (!isSuper && p.company_id !== req.companyId) { res.status(403).json({ error: 'Accès refusé' }); return; }

      const rows = loadData('user_permissions');
      const idx = rows.findIndex((x: any) => x.user_id === id);
      const now = new Date().toISOString();
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], permissions, updated_at: now };
      } else {
        rows.push({ id: crypto.randomUUID(), user_id: id, company_id: p.company_id, permissions, created_at: now, updated_at: now });
      }
      saveData('user_permissions', rows);
      res.json({ permissions });
    } else {
      const { data: profile } = await supabaseAdmin.from('profiles').select('company_id').eq('id', id).single();
      if (!profile) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
      if (!isSuper && profile.company_id !== req.companyId) { res.status(403).json({ error: 'Accès refusé' }); return; }

      const { error } = await supabaseAdmin.from('user_permissions').upsert(
        { user_id: id, company_id: profile.company_id, permissions, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      res.json({ permissions });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id/permissions  (reset to defaults)
router.delete('/:id/permissions', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuper = req.userRole === 'superadmin';

    if (isMock) {
      const profiles = loadData('profiles');
      const p = profiles.find((x: any) => x.id === id);
      if (!p) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
      if (!isSuper && p.company_id !== req.companyId) { res.status(403).json({ error: 'Accès refusé' }); return; }

      const rows = loadData('user_permissions').filter((x: any) => x.user_id !== id);
      saveData('user_permissions', rows);
      res.json({ permissions: DEFAULT_PERMISSIONS[p.role] ?? DEFAULT_PERMISSIONS.client, is_custom: false });
    } else {
      const { data: profile } = await supabaseAdmin.from('profiles').select('role, company_id').eq('id', id).single();
      if (!profile) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
      if (!isSuper && profile.company_id !== req.companyId) { res.status(403).json({ error: 'Accès refusé' }); return; }

      await supabaseAdmin.from('user_permissions').delete().eq('user_id', id);
      res.json({ permissions: DEFAULT_PERMISSIONS[profile.role] ?? DEFAULT_PERMISSIONS.client, is_custom: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
