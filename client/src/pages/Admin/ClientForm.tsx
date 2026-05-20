import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useClient, useCreateClient, useUpdateClient } from '../../hooks/useClients';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: client, isLoading } = useClient(id);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

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
    if (client && isEdit) {
      reset({
        name: client.name,
        company: client.company || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        address: client.address || '',
        notes: client.notes || '',
        is_active: client.is_active,
      });
    }
  }, [client, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateClient.mutateAsync({ id: id!, updates: data });
        navigate(`/admin/clients/${id}`);
      } else {
        const newClient = await createClient.mutateAsync(data);
        navigate(`/admin/clients/${newClient.id}`);
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
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {isEdit ? 'Edit Client' : 'Add New Client'}
          </h1>
        </div>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Client Name *</label>
            <input {...register('name')} className="input" placeholder="e.g. John Doe or Acme Corp" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Company / Organization</label>
              <input {...register('company')} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input {...register('contact_email')} type="email" className="input" placeholder="Optional" />
              {errors.contact_email && <p className="text-red-400 text-xs mt-1">{errors.contact_email.message}</p>}
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input {...register('contact_phone')} className="input" placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <textarea {...register('address')} className="input min-h-[80px]" placeholder="Optional" />
          </div>

          <div>
            <label className="label">Internal Notes</label>
            <textarea {...register('notes')} className="input min-h-[100px]" placeholder="Optional notes for admin use..." />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-gray-700 bg-gray-900 text-brand-500 focus:ring-brand-500" />
            <label htmlFor="is_active" className="text-sm text-gray-300">Client is active (can have tickets assigned)</label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
