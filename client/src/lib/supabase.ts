import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isMock = !supabaseUrl || supabaseUrl.includes('placeholder');

class MockQueryBuilder {
  table: string;
  filters: ((item: any) => boolean)[] = [];
  sortField?: string;
  ascending = true;
  isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
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

  // Allow using standard await / promise
  async then(resolve: any, reject?: any) {
    try {
      if (this.table === 'profiles') {
        const res = await fetch('http://localhost:4000/api/mock/profiles');
        if (!res.ok) throw new Error('Failed to fetch mock profiles');
        let data = await res.json();

        for (const filter of this.filters) {
          data = data.filter(filter);
        }

        if (this.sortField) {
          data.sort((a: any, b: any) => {
            const valA = a[this.sortField!];
            const valB = b[this.sortField!];
            if (valA < valB) return this.ascending ? -1 : 1;
            if (valA > valB) return this.ascending ? 1 : -1;
            return 0;
          });
        }

        if (this.isSingle) {
          resolve({ data: data[0] || null, error: null });
        } else {
          resolve({ data, error: null });
        }
      } else {
        resolve({ data: this.isSingle ? null : [], error: null });
      }
    } catch (e: any) {
      resolve({ data: null, error: e });
    }
  }

  async upsert(data: any) {
    try {
      const res = await fetch('http://localhost:4000/api/mock/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to upsert mock profile');
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }
}

class MockSupabase {
  private listeners: ((event: string, session: any) => void)[] = [];

  private notify(event: string, session: any) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, session);
      } catch (e) {
        console.error(e);
      }
    });
  }

  auth = {
    getSession: async () => {
      const sessionStr = localStorage.getItem('mock_session');
      return { data: { session: sessionStr ? JSON.parse(sessionStr) : null }, error: null };
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      try {
        const res = await fetch('http://localhost:4000/api/mock/profiles');
        if (!res.ok) throw new Error('Failed to fetch mock profiles');
        const profiles = await res.json();
        const profile = profiles.find((p: any) => p.email === email);
        if (!profile) return { data: { user: null }, error: new Error('User not found. Please register.') };

        const session = {
          access_token: 'mock_token_' + profile.id,
          user: { id: profile.id, email: profile.email },
        };
        localStorage.setItem('mock_session', JSON.stringify(session));
        this.notify('SIGNED_IN', session);
        return { data: { user: session.user, session }, error: null };
      } catch (e: any) {
        return { data: { user: null }, error: e };
      }
    },
    signUp: async ({ email }: { email: string }) => {
      const id = crypto.randomUUID();
      const user = { id, email };
      const session = { access_token: 'mock_token_' + id, user };
      localStorage.setItem('mock_session', JSON.stringify(session));
      this.notify('SIGNED_UP', session);
      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_session');
      this.notify('SIGNED_OUT', null);
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      const sessionStr = localStorage.getItem('mock_session');
      callback('SIGNED_IN', sessionStr ? JSON.parse(sessionStr) : null);
      this.listeners.push(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners = this.listeners.filter((l) => l !== callback);
            },
          },
        },
      };
    },
  };


  from(table: string) {
    return new MockQueryBuilder(table);
  }

  channel() {
    const channelObj = {
      on: function () {
        return channelObj;
      },
      subscribe: () => channelObj,
    };
    return channelObj;
  }

  removeChannel() {
    return true;
  }
}

export const supabase = isMock
  ? (new MockSupabase() as any)
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder'
    );
