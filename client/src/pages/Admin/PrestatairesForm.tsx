import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save, Building2 } from 'lucide-react';
import { usePrestataire, useCreatePrestataire, useUpdatePrestataire } from '../../hooks/usePrestataires';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  contact_email: z.string().email('Adresse e-mail invalide').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export function PrestatairesForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: prestataire, isLoading } = usePrestataire(id);
  const createPrestataire = useCreatePrestataire();
  const updatePrestataire = useUpdatePrestataire();

  const isAdmin = window.location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/prestataires' : '/prestataires';

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    if (prestataire && isEdit) {
      reset({
        name: prestataire.name,
        contact_email: prestataire.contact_email || '',
        contact_phone: prestataire.contact_phone || '',
        address: prestataire.address || '',
        notes: prestataire.notes || '',
        is_active: prestataire.is_active,
      });
    }
  }, [prestataire, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updatePrestataire.mutateAsync({ id: id!, updates: data });
        navigate(`${basePath}/${id}`);
      } else {
        const created = await createPrestataire.mutateAsync(data);
        navigate(`${basePath}/${created.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" id="back-btn">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-500" />
            {isEdit ? 'Modifier le prestataire' : 'Ajouter un prestataire'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isEdit ? 'Mettre à jour les informations du prestataire' : 'Créer un nouveau prestataire'}
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Nom du prestataire *</label>
            <input
              id="input-name"
              {...register('name')}
              className="input"
              placeholder="ex: Jean Dupont ou Acme SARL"
            />
            {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">E-mail de contact</label>
              <input
                id="input-email"
                {...register('contact_email')}
                type="email"
                className="input"
                placeholder="Optionnel"
              />
              {errors.contact_email && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.contact_email.message}</p>
              )}
            </div>
            <div>
              <label className="label">Téléphone de contact</label>
              <input id="input-phone" {...register('contact_phone')} className="input" placeholder="Optionnel" />
            </div>
          </div>

          <div>
            <label className="label">Adresse</label>
            <textarea
              id="input-address"
              {...register('address')}
              className="input min-h-[80px]"
              placeholder="Optionnel"
            />
          </div>

          <div>
            <label className="label">Notes internes</label>
            <textarea
              id="input-notes"
              {...register('notes')}
              className="input min-h-[100px]"
              placeholder="Notes visibles uniquement par les admins..."
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Prestataire actif (peut se voir assigner des tickets)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary" id="cancel-btn">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" id="submit-btn">
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />
              }
              {isEdit ? 'Enregistrer' : 'Créer le prestataire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
