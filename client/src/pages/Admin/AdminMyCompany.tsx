import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axios';
import { Header } from '../../components/layout/Header';
import { useAuthStore } from '../../store/authStore';
import {
  Building2, Mail, Phone, MapPin, Save, Loader2,
  CheckCircle, XCircle, Calendar, Image as ImageIcon, X, Upload, Trash2,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { formatDate } from '../../lib/utils';

const schema = z.object({
  name:          z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  contact_email: z.string().email("Adresse email invalide").optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  address:       z.string().optional().or(z.literal('')),
});

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

type FormData = z.infer<typeof schema>;

interface Company {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminMyCompany() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['admin-my-company'],
    queryFn: () => api.get('/admin/company').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [logoError, setLogoError] = useState('');

  useEffect(() => {
    if (company) {
      reset({
        name:          company.name,
        contact_email: company.contact_email ?? '',
        contact_phone: company.contact_phone ?? '',
        address:       company.address ?? '',
      });
    }
  }, [company, reset]);

  // Patches both the local company cache AND the auth store
  const applyCompanyUpdate = (updated: Partial<Company> & { id: string; name: string; slug: string; logo_url: string | null }) => {
    queryClient.setQueryData<Company | undefined>(['admin-my-company'], prev => prev ? { ...prev, ...updated } : prev);
    if (user) {
      setUser({
        ...user,
        company: { ...(user.company ?? {} as any), id: updated.id, name: updated.name, slug: updated.slug, logo_url: updated.logo_url },
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.put('/admin/company', data).then(r => r.data),
    onSuccess: (updated) => {
      reset({
        name:          updated.name,
        contact_email: updated.contact_email ?? '',
        contact_phone: updated.contact_phone ?? '',
        address:       updated.address ?? '',
      });
      applyCompanyUpdate(updated);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('logo', file);
      return api.post('/admin/company/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    onSuccess: (updated) => applyCompanyUpdate(updated),
    onError: (err: any) => setLogoError(err.message || 'Échec du téléversement du logo.'),
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => api.delete('/admin/company/logo').then(r => r.data),
    onSuccess: (updated) => applyCompanyUpdate(updated),
  });

  const handleFile = (file: File) => {
    setLogoError('');
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Format invalide. PNG, JPG, WEBP ou SVG uniquement.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('Le fichier dépasse 2 Mo.');
      return;
    }
    uploadLogoMutation.mutate(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Mon entreprise"
        subtitle="Consultez et mettez à jour les informations de votre entreprise"
      />

      <div className="px-6 max-w-3xl space-y-5">

        {/* Status + meta bar */}
        {company && (
          <div className="glass-card px-5 py-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {company.is_active ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-500/30">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/30">
                  <XCircle className="w-3 h-3" /> Inactive
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-mono text-gray-600 dark:text-gray-300">{company.slug}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ml-auto">
              <Calendar className="w-3.5 h-3.5" />
              Créée le {formatDate(company.created_at)}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="glass-card p-6">
          <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-5">

            {/* Logo */}
            <div>
              <label className="label block mb-2">
                <ImageIcon className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                Logo de l'entreprise
              </label>

              <div className="flex items-start gap-4">
                {/* Current logo preview */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 overflow-hidden flex items-center justify-center">
                  {company?.logo_url ? (
                    <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-9 h-9 text-gray-300 dark:text-gray-600" />
                  )}
                  {uploadLogoMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                    </div>
                  )}
                </div>

                {/* Drop zone */}
                <div className="flex-1 min-w-0">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 px-4 py-5 text-center select-none
                      ${dragOver
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50/60 dark:hover:bg-gray-800/30'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = '';
                      }}
                    />
                    <Upload className={`w-5 h-5 mx-auto mb-1.5 ${dragOver ? 'text-brand-500' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {dragOver ? 'Déposez le fichier ici' : 'Cliquez ou glissez-déposez un fichier'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP ou SVG — max 2 Mo</p>
                  </div>

                  {/* Action row */}
                  {company?.logo_url && (
                    <button
                      type="button"
                      onClick={() => deleteLogoMutation.mutate()}
                      disabled={deleteLogoMutation.isPending}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors disabled:opacity-50"
                    >
                      {deleteLogoMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                      Retirer le logo actuel
                    </button>
                  )}

                  {logoError && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
                      <X className="w-3 h-3" /> {logoError}
                    </p>
                  )}
                  {uploadLogoMutation.isSuccess && !logoError && (
                    <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3" /> Logo mis à jour.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="label block mb-1.5">
                <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                Nom de l'entreprise <span className="text-red-400">*</span>
              </label>
              <input {...register('name')} className="input w-full" placeholder="ex: Acme Corp" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1.5">
                  <Mail className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                  Email de contact
                </label>
                <input {...register('contact_email')} type="email" className="input w-full" placeholder="contact@entreprise.com" />
                {errors.contact_email && <p className="text-red-500 text-xs mt-1">{errors.contact_email.message}</p>}
              </div>
              <div>
                <label className="label block mb-1.5">
                  <Phone className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                  Téléphone
                </label>
                <input {...register('contact_phone')} className="input w-full" placeholder="+33 1 23 45 67 89" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="label block mb-1.5">
                <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                Adresse
              </label>
              <textarea
                {...register('address')}
                className="input w-full min-h-[80px] resize-none"
                placeholder="Adresse physique de l'entreprise..."
              />
            </div>

            {/* Success banner */}
            {updateMutation.isSuccess && !isDirty && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Informations enregistrées avec succès.
              </div>
            )}

            {/* Error banner */}
            {updateMutation.isError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                {(updateMutation.error as any)?.message || 'Erreur lors de la mise à jour.'}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending || !isDirty}
                className="btn-primary disabled:opacity-40"
              >
                {updateMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
