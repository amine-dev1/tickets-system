import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

/* ── Translation map ──────────────────────────────────────────── */

/** Exact-match translations (key = backend English message). */
const EXACT: Record<string, string> = {
  // Auth / access
  'Unauthorized':                                           'Non authentifié. Veuillez vous reconnecter.',
  'Missing or invalid authorization header':               'En-tête d\'autorisation manquant ou invalide.',
  'Invalid token':                                         'Session expirée. Veuillez vous reconnecter.',
  'Access denied':                                         'Accès refusé.',
  'Access denied.':                                        'Accès refusé.',
  'Access denied. Admin role required.':                   'Accès refusé. Rôle administrateur requis.',
  'Access denied. Superadmin role required.':              'Accès refusé. Rôle super-administrateur requis.',
  'Access denied. Staff role required.':                   'Accès refusé. Rôle agent ou administrateur requis.',
  'Access denied. Client role required.':                  'Accès refusé. Rôle client requis.',
  'Access denied. No company assigned.':                   'Accès refusé. Aucune entreprise assignée à votre compte.',
  'Cannot assign this role':                               'Vous n\'êtes pas autorisé à attribuer ce rôle.',
  'Cannot delete users from other companies':              'Vous ne pouvez pas supprimer des utilisateurs d\'une autre entreprise.',
  'Cannot modify users from other companies':              'Vous ne pouvez pas modifier des utilisateurs d\'une autre entreprise.',
  'Cannot reset password for users from other companies':  'Vous ne pouvez pas réinitialiser le mot de passe d\'un utilisateur d\'une autre entreprise.',
  'Rôle non autorisé':                                     'Ce rôle n\'est pas autorisé.',

  // Users
  'email, password et role sont requis':   'L\'email, le mot de passe et le rôle sont obligatoires.',
  'permissions requis':                    'Le champ permissions est requis.',
  'Utilisateur introuvable':               'Utilisateur introuvable.',

  // Tickets
  'Ticket not found':                                    'Ticket introuvable.',
  'Company ID required for admin creating tickets':      'L\'identifiant de l\'entreprise est requis.',
  'Failed to create ticket':                             'Échec de la création du ticket.',
  'Failed to update ticket':                             'Échec de la mise à jour du ticket.',

  // Missions
  'Mission not found':                    'Mission introuvable.',
  'Mission not found or update failed':   'Mission introuvable ou mise à jour échouée.',
  'Failed to create mission':             'Échec de la création de la mission.',

  // Prestataires
  'Prestataire not found':                          'Prestataire introuvable.',
  'Prestataire not found or update failed':         'Prestataire introuvable ou mise à jour échouée.',
  'Prestataire does not belong to your company':    'Ce prestataire n\'appartient pas à votre entreprise.',
  'Failed to create prestataire':                   'Échec de la création du prestataire.',

  // Companies
  'Company not found':     'Entreprise introuvable.',
  'Company ID required':   'L\'identifiant de l\'entreprise est requis.',

  // Comments / attachments
  'Comment not found':       'Commentaire introuvable.',
  'Attachment not found':    'Pièce jointe introuvable.',
  'No files provided':       'Aucun fichier fourni.',
  'Failed to create comment': 'Échec de l\'envoi du commentaire.',

  // Generic server
  'Internal server error':                             'Erreur interne du serveur.',
  'Internal server error during validation':           'Erreur lors de la validation des données.',
  'Internal server error during authentication':       'Erreur lors de l\'authentification.',
  'Internal server error resolving user scope':        'Erreur lors de la résolution du périmètre utilisateur.',
  'An unexpected internal server error occurred.':     'Une erreur inattendue s\'est produite.',
  'Route not found':                                   'Route introuvable.',

  // Supabase Auth errors (come through the backend)
  'A user with this email address has already been registered': 'Un compte avec cette adresse email existe déjà.',
  'Unable to validate email address: invalid format':           'L\'adresse email est invalide.',
  'Password should be at least 6 characters':                   'Le mot de passe doit contenir au moins 6 caractères.',
  'Email not confirmed':                                        'Adresse email non confirmée.',
  'Invalid login credentials':                                  'Email ou mot de passe incorrect.',
  'User not found':                                             'Utilisateur introuvable.',
  'New password should be different from the old password':     'Le nouveau mot de passe doit être différent de l\'ancien.',
};

/** Regex-based translations for dynamic error messages. */
const PATTERNS: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [
    /Accès refusé : permission "(\w+)\.(\w+)" requise\./,
    (m) => {
      const mod: Record<string, string> = { tickets: 'Tickets', missions: 'Missions', prestataires: 'Prestataires', users: 'Utilisateurs', dashboard: 'Tableau de bord' };
      const act: Record<string, string> = { view: 'consulter', create: 'créer', edit: 'modifier', delete: 'supprimer' };
      return `Accès refusé : vous n'avez pas la permission de ${act[m[2]] ?? m[2]} les ${mod[m[1]] ?? m[1]}.`;
    },
  ],
  [/Failed to upload (.+):.*/, (m) => `Échec du téléversement du fichier « ${m[1]} ».`],
  [/Failed to save attachment record:.*/, () => 'Échec de l\'enregistrement de la pièce jointe.'],
];

/** HTTP status code fallbacks when no specific message is available. */
const HTTP_STATUS: Record<number, string> = {
  400: 'Requête invalide.',
  401: 'Non authentifié. Veuillez vous reconnecter.',
  403: 'Accès refusé.',
  404: 'Ressource introuvable.',
  409: 'Conflit : cette ressource existe déjà.',
  422: 'Données invalides.',
  429: 'Trop de requêtes. Veuillez patienter.',
  500: 'Erreur interne du serveur.',
  502: 'Serveur inaccessible.',
  503: 'Service temporairement indisponible.',
};

function translate(raw: string, status?: number): string {
  if (EXACT[raw]) return EXACT[raw];

  for (const [pattern, handler] of PATTERNS) {
    const m = raw.match(pattern);
    if (m) return typeof handler === 'function' ? handler(m) : handler;
  }

  if (status && HTTP_STATUS[status] && (!raw || raw === 'Internal server error')) {
    return HTTP_STATUS[status];
  }

  // Return as-is if it already looks French (contains accented chars or common French words)
  if (/[àâäéèêëîïôùûüç]|Erreur|Accès|introuvable|refusé/i.test(raw)) return raw;

  return raw || HTTP_STATUS[status ?? 500] || 'Une erreur est survenue.';
}

/* ── Interceptors ─────────────────────────────────────────────── */

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const raw: string = err.response?.data?.error || err.message || '';
    const status: number | undefined = err.response?.status;
    const french = translate(raw, status);

    // Patch the response data so components reading err.response?.data?.error also get French
    if (err.response?.data) err.response.data.error = french;

    const error = new Error(french) as any;
    error.status = status;
    error.response = err.response;
    return Promise.reject(error);
  }
);
