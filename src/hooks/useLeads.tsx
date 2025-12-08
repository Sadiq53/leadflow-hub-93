import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Lead {
  id: string;
  company_name: string;
  company_website: string | null;
  campaign: string | null;
  source: string | null;
  source_link: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  created_by: string;
  profiles?: { name: string };
  pocs: { count: number }[];
}

export const useLeads = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('id, company_name, company_website, campaign, source, source_link, notes, created_at, tags, created_by, pocs(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const createdByIds = Array.from(new Set((leadsData || []).map((l: any) => l.created_by))).filter(Boolean);
      
      let profilesMap: Record<string, string> = {};
      if (createdByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', createdByIds);
        profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p.name]));
      }

      return (leadsData || []).map((l: any) => ({
        ...l,
        profiles: { name: profilesMap[l.created_by] || 'Unknown' }
      })) as Lead[];
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Lead deleted", description: "Lead has been deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
    }
  });

  return {
    leads: leadsQuery.data || [],
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    refetch: leadsQuery.refetch,
    deleteLead: deleteLead.mutate,
    isDeleting: deleteLead.isPending,
  };
};

export const useLead = (leadId: string | undefined) => {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (error) throw error;
      if (!leadData) return null;

      // Fetch creator profile
      let creatorName = 'Unknown';
      if (leadData.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', leadData.created_by)
          .maybeSingle();
        creatorName = profile?.name || 'Unknown';
      }

      return { ...leadData, profiles: { name: creatorName } };
    },
    enabled: !!leadId,
    staleTime: 30000,
  });
};

export default useLeads;
