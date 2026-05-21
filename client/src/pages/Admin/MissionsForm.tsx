import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save, Briefcase } from 'lucide-react';
import { useMission, useCreateMission, useUpdateMission } from '../../hooks/useMissions';
import { usePrestataires } from '../../hooks/usePrestataires';
import { FormSelect } from '../../components/ui/FormSelect';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  prestataire_id: z.string().uuid('Sélectionner un prestataire'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function MissionsForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: mission, isLoading } = useMission(id);
  const { data: prestataires } = usePrestataires();
  const createMission = useCreateMission();
  const updateMission = useUpdateMission();

  const isAdmin = window.location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/missions' : '/missions';

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'pending' },
  });

  useEffect(() => {
    if (mission && isEdit) {
      reset({
        name: mission.name,
        description: mission.description || '',
        prestataire_id: mission.prestataire_id,
        status: mission.status,
        start_date: mission.start_date?.slice(0, 10) || '',
        end_date: mission.end_date?.slice(0, 10) || '',
        budget: mission.budget != null ? String(mission.budget) : '',
      });
    }
  }, [mission, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        name: data.name,
        description: data.description || '',
        prestataire_id: data.prestataire_id,
        status: data.status,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        budget: data.budget ? Number(data.budget) : null,
      };

      if (isEdit) {
        await updateMission.mutateAsync({ id: id!, updates: payload });
        navigate(`${basePath}/${id}`);
      } else {
        const created = await createMission.mutateAsync(payload);
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
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" id="back-btn">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-brand-500" />
            {isEdit ? 'Modifier la mission' : 'Nouvelle mission'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isEdit ? 'Mettre à jour les informations de la mission' : 'Créer une nouvelle mission projet'}
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Nom de la mission *</label>
            <input
              id="input-name"
              {...register('name')}
              className="input"
              placeholder="ex: Refonte site e-commerce"
            />
            {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Prestataire assigné *</label>
            <FormSelect
              id="input-prestataire"
              {...register('prestataire_id')}
              options={prestataires?.map((p) => ({ value: p.id, label: p.name })) || []}
              placeholder="— Sélectionner —"
            />
            {errors.prestataire_id && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.prestataire_id.message}</p>
            )}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              id="input-description"
              {...register('description')}
              className="input min-h-[100px]"
              placeholder="Objectif et détails de la mission..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date de début</label>
              <input id="input-start" type="date" {...register('start_date')} className="input" />
            </div>
            <div>
              <label className="label">Date de fin</label>
              <input id="input-end" type="date" {...register('end_date')} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Statut</label>
              <FormSelect
                id="input-status"
                {...register('status')}
                options={[
                  { value: 'pending', label: 'En attente' },
                  { value: 'in_progress', label: 'En cours' },
                  { value: 'completed', label: 'Terminée' },
                  { value: 'cancelled', label: 'Annulée' },
                ]}
              />
            </div>
            <div>
              <label className="label">Budget (€)</label>
              <input
                id="input-budget"
                type="number"
                step="0.01"
                min="0"
                {...register('budget')}
                className="input"
                placeholder="Optionnel"
              />
            </div>
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
              {isEdit ? 'Enregistrer' : 'Créer la mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
