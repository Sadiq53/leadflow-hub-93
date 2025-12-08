import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Template {
  id: string;
  name: string;
  body: string;
  is_shared: boolean;
  created_at: string;
  created_by: string;
  followup_day: number | null;
}

export const useTemplates = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .or(`created_by.eq.${user.id},is_shared.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Template[];
    },
    staleTime: 60000,
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: { name: string; body: string; is_shared: boolean; followup_day: number | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('templates')
        .insert({ ...templateData, created_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: "Success", description: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...templateData }: { id: string; name: string; body: string; is_shared: boolean; followup_day: number | null }) => {
      const { error } = await supabase
        .from('templates')
        .update(templateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: "Success", description: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: "Success", description: "Template deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  });

  const copyTemplate = async (template: Template) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(template.body);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = template.body;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast({ title: "Copied!", description: "Template copied to clipboard" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy template", variant: "destructive" });
    }
  };

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,
    createTemplate: createTemplate.mutate,
    isCreating: createTemplate.isPending,
    updateTemplate: updateTemplate.mutate,
    isUpdating: updateTemplate.isPending,
    deleteTemplate: deleteTemplate.mutate,
    isDeleting: deleteTemplate.isPending,
    copyTemplate,
  };
};

export default useTemplates;
