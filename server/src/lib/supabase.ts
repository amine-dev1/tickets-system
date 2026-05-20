import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const isMock = !supabaseUrl || supabaseUrl.includes('placeholder');

const DB_FILE = path.join(__dirname, '../../db.json');

export function loadData(table: string): any[] {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ tickets: [], ticket_comments: [], ticket_history: [], profiles: [], companies: [], prestataires: [], missions: [] }, null, 2)
    );
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return db[table] || [];
  } catch (e) {
    return [];
  }
}

export function saveData(table: string, data: any[]) {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ tickets: [], ticket_comments: [], ticket_history: [], profiles: [], companies: [], prestataires: [], missions: [] }, null, 2)
    );
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    db[table] = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to save to mock DB', e);
  }
}

class MockQueryBuilder {
  table: string;
  data: any[];
  filters: ((item: any) => boolean)[] = [];
  sortField?: string;
  ascending = true;
  isSingle = false;
  action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  actionData: any = null;

  constructor(table: string) {
    this.table = table;
    this.data = loadData(table);
  }

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  is(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  or(filterStr: string) {
    const parts = filterStr.split(',');
    this.filters.push((item) => {
      return parts.some((part) => {
        const subParts = part.split('.');
        const col = subParts[0];
        const val = subParts[2];
        const cleanVal = (val || '').replace(/%/g, '').toLowerCase();
        return String(item[col || ''] || '').toLowerCase().includes(cleanVal);
      });
    });
    return this;
  }

  ilike(column: string, pattern: string) {
    const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push((item) => {
      return String(item[column] || '').toLowerCase().includes(cleanPattern);
    });
    return this;
  }

  order(column: string, options = { ascending: true }) {
    this.sortField = column;
    this.ascending = options.ascending;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(item: any) {
    this.action = 'insert';
    this.actionData = item;
    return this;
  }

  update(updateData: any) {
    this.action = 'update';
    this.actionData = updateData;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  async then(resolve: any) {
    try {
      if (this.action === 'insert') {
        const item = this.actionData;
        const items = Array.isArray(item) ? item : [item];
        const newItems = items.map((x) => ({
          id: x.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...x,
        }));

        this.data.push(...newItems);
        saveData(this.table, this.data);
        
        this.filters = [(x) => x.id === newItems[0].id];
        this.isSingle = !Array.isArray(item);
      } 
      else if (this.action === 'update') {
        let result = [...this.data];
        for (const filter of this.filters) {
          result = result.filter(filter);
        }
        result.forEach((item) => {
          Object.assign(item, { ...this.actionData, updated_at: new Date().toISOString() });
        });
        saveData(this.table, this.data);
      }
      else if (this.action === 'delete') {
        let toDelete = [...this.data];
        for (const filter of this.filters) {
          toDelete = toDelete.filter(filter);
        }
        const idsToDelete = new Set(toDelete.map((x) => x.id));
        const newData = this.data.filter((x) => !idsToDelete.has(x.id));
        saveData(this.table, newData);
        resolve({ data: null, count: 0, error: null });
        return; 
      }

      let result = [...this.data];
      for (const filter of this.filters) {
        result = result.filter(filter);
      }

      if (this.sortField) {
        result.sort((a, b) => {
          const valA = a[this.sortField!];
          const valB = b[this.sortField!];
          if (valA < valB) return this.ascending ? -1 : 1;
          if (valA > valB) return this.ascending ? 1 : -1;
          return 0;
        });
      }

      if (this.table === 'companies') {
        const profiles = loadData('profiles');
        const tickets = loadData('tickets');
        const prestataires = loadData('prestataires');
        result = result.map((company) => {
          const compProfiles = profiles.filter((p: any) => p.company_id === company.id);
          const compTickets = tickets.filter((t: any) => t.company_id === company.id);
          const compPrestataires = prestataires.filter((pr: any) => pr.company_id === company.id);
          return {
            ...company,
            profiles: [{ count: compProfiles.length }],
            tickets: [{ count: compTickets.length }],
            prestataires: [{ count: compPrestataires.length }],
          };
        });
      }

      if (this.table === 'missions') {
        const prestataires = loadData('prestataires');
        result = result.map((item) => {
          const prestataire = item.prestataire_id
            ? prestataires.find((p: any) => p.id === item.prestataire_id)
            : undefined;
          return { ...item, prestataire };
        });
      }

      if (this.table === 'tickets' || this.table === 'ticket_comments') {
        const profiles = loadData('profiles');
        const prestataires = loadData('prestataires');
        result = result.map((item) => {
          const creator_id = item.created_by || item.author_id;
          const creatorProfile = profiles.find((p: any) => p.id === creator_id) || {
            full_name: 'Mock User',
            email: 'mock@example.com',
            role: 'client',
          };
          
          let prestataire = undefined;
          if (this.table === 'tickets' && item.prestataire_id) {
            prestataire = prestataires.find((c: any) => c.id === item.prestataire_id) || {
              name: 'Mock Prestataire',
            };
          }

          let assigneeProfile = undefined;
          if (this.table === 'tickets' && item.assigned_to) {
            assigneeProfile = profiles.find((p: any) => p.id === item.assigned_to);
          }
          
          return {
            ...item,
            profiles: creatorProfile,
            created_by_profile: creatorProfile,
            prestataire: prestataire,
            assigned_to_profile: assigneeProfile,
          };
        });
      }

      if (this.isSingle) {
        resolve({ data: result[0] || null, count: result.length ? 1 : 0, error: result[0] ? null : { message: 'Not found', code: 'PGRST116' } });
      } else {
        resolve({ data: result, count: result.length, error: null });
      }
    } catch (err: any) {
      resolve({ data: null, count: 0, error: { message: err.message } });
    }
  }
}

class MockAuth {
  async getUser(token: string) {
    if (token.startsWith('Bearer mock_token_') || token.startsWith('mock_token_')) {
      const id = token.replace('Bearer ', '').replace('mock_token_', '');
      const profiles = loadData('profiles');
      const profile = profiles.find((p: any) => p.id === id);
      return {
        data: {
          user: {
            id,
            email: profile?.email || 'mock@example.com',
            user_metadata: {
              full_name: profile?.full_name || 'Mock User',
            },
          },
        },
        error: null,
      };
    }
    return { data: { user: null }, error: { message: 'Invalid token' } };
  }
}

class MockSupabaseClient {
  auth = new MockAuth();

  from(table: string) {
    return new MockQueryBuilder(table) as any;
  }
}

export const supabaseAdmin = isMock
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
