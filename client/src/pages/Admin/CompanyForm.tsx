import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save, Building2 } from 'lucide-react';
import { useCompany, useCreateCompany, useUpdateCompany } from '../../hooks/useCompanies';

const schema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est requis"),
  contact_email: z.string().email('Adresse e-mail invalide').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export function CompanyForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: company, isLoading } = useCompany(id);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    if (company && isEdit) {
      reset({
        name: company.name,
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
        address: company.address || '',
        is_active: company.is_active,
      });
    }
  }, [company, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateCompany.mutateAsync({ id: id!, updates: data });
        navigate(`/admin/companies/${id}`);
      } else {
        const newCompany = await createCompany.mutateAsync(data);
        navigate(`/admin/companies/${newCompany.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" id="back-btn">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            {isEdit ? "Modifier l'entreprise" : 'Créer une entreprise'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isEdit ? "Mettre à jour les détails de l'entreprise" : 'Ajouter une nouvelle entreprise locataire'}
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label className="label">Nom de l'entreprise *</label>
            <input
              id="input-name"
              {...register('name')}
              className="input"
              placeholder="ex: Travel Agency Inc."
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Email & Phone */}
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
                <p className="text-red-400 text-xs mt-1">{errors.contact_email.message}</p>
              )}
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                id="input-phone"
                {...register('contact_phone')}
                className="input"
                placeholder="Optionnel"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="label">Adresse</label>
            <textarea
              id="input-address"
              {...register('address')}
              className="input min-h-[80px]"
              placeholder="Adresse physique de l'entreprise..."
            />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="rounded border-gray-700 bg-gray-900 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              Entreprise active (ses utilisateurs peuvent se connecter et soumettre des tickets)
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary" id="cancel-btn">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" id="submit-btn">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
