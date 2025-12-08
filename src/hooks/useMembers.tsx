import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Member {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
  lead_id: string;
  company_name: string;
  response: string | null;
  linkedin_invite_accepted: boolean;
  response_type: string;
  auto_removed: boolean;
  invite_accepted_at: string | null;
}

export const useMembers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pocs')
        .select(`id, name, email, linkedin_url, title, response, linkedin_invite_accepted, lead_id, response_type, auto_removed, invite_accepted_at, leads(company_name)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        linkedin_url: p.linkedin_url,
        title: p.title,
        lead_id: p.lead_id,
        response: p.response,
        linkedin_invite_accepted: p.linkedin_invite_accepted,
        response_type: p.response_type,
        auto_removed: p.auto_removed,
        invite_accepted_at: p.invite_accepted_at,
        company_name: p.leads?.company_name || ""
      })) as Member[];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const scheduleFollowups = async (member: Member, acknowledgedAt: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const day1 = new Date(acknowledgedAt);
    const day2 = new Date(acknowledgedAt);
    day2.setDate(day2.getDate() + 1);
    const day3 = new Date(acknowledgedAt);
    day3.setDate(day3.getDate() + 2);

    const notifications = [
      { user_id: user.id, lead_id: member.lead_id, poc_id: member.id, type: 'followup_day_1', scheduled_for: day1.toISOString(), status: 'pending' },
      { user_id: user.id, lead_id: member.lead_id, poc_id: member.id, type: 'followup_day_2', scheduled_for: day2.toISOString(), status: 'pending' },
      { user_id: user.id, lead_id: member.lead_id, poc_id: member.id, type: 'followup_day_3', scheduled_for: day3.toISOString(), status: 'pending' }
    ];
    
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;
  };

  const toggleInvite = useMutation({
    mutationFn: async ({ member, accepted }: { member: Member; accepted: boolean }) => {
      const acknowledgedAt = new Date();
      
      await supabase
        .from('pocs')
        .update({ 
          linkedin_invite_accepted: accepted,
          invite_accepted_at: accepted ? acknowledgedAt.toISOString() : null
        })
        .eq('id', member.id);

      if (accepted) {
        await scheduleFollowups(member, acknowledgedAt);
      } else {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('poc_id', member.id)
          .eq('status', 'pending');
      }
      
      return accepted;
    },
    onSuccess: (accepted) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ 
        title: accepted ? 'Invite acknowledged' : 'Invite unacknowledged',
        description: accepted 
          ? '3-day follow-up sequence scheduled.' 
          : 'All pending messages cancelled.'
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update invite status.', variant: 'destructive' });
    }
  });

  const acknowledgeResponse = useMutation({
    mutationFn: async ({ member, responseType }: { member: Member; responseType: 'positive' | 'negative' | 'neutral' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('pocs')
        .update({ response: 'Responded', response_type: responseType })
        .eq('id', member.id);

      if (responseType === 'negative') {
        const { data: leadPocs } = await supabase
          .from('pocs')
          .select('id')
          .eq('lead_id', member.lead_id);

        if (leadPocs && leadPocs.length > 0) {
          const pocIds = leadPocs.map(p => p.id);
          
          await supabase
            .from('notifications')
            .update({ status: 'cancelled' })
            .in('poc_id', pocIds)
            .eq('status', 'pending');

          await supabase
            .from('pocs')
            .update({ 
              auto_removed: true,
              auto_removed_at: new Date().toISOString(),
              auto_removed_reason: `Negative response from ${member.name}`
            })
            .in('id', pocIds)
            .neq('id', member.id);
        }
      } else {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('poc_id', member.id)
          .eq('status', 'pending');
      }

      await supabase.from('activities').insert({
        lead_id: member.lead_id,
        poc_id: member.id,
        user_id: user.id,
        action: responseType === 'negative' ? 'negative_response' : 'response_received',
        metadata: { company: member.company_name, response_type: responseType }
      });

      return { responseType, companyName: member.company_name };
    },
    onSuccess: ({ responseType, companyName }) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      
      toast({ 
        title: responseType === 'negative' ? 'Negative response recorded' : 'Response acknowledged',
        description: responseType === 'negative' 
          ? `All ${companyName} contacts removed from queue.`
          : `Marked as ${responseType}. Removed from follow-up queue.`
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to acknowledge response.', variant: 'destructive' });
    }
  });

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    refetch: membersQuery.refetch,
    toggleInvite: toggleInvite.mutate,
    isTogglingInvite: toggleInvite.isPending,
    acknowledgeResponse: acknowledgeResponse.mutate,
    isAcknowledging: acknowledgeResponse.isPending,
    scheduleFollowups,
  };
};

export default useMembers;
