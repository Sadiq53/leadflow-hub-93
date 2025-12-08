import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface TodayTask {
  id: string;
  poc_id: string;
  poc_name: string;
  company_name: string;
  linkedin_url: string | null;
  type: string;
  scheduled_for: string;
  lead_id: string;
  invite_accepted_at: string;
  followup_day: number;
}

const getFollowupDay = (type: string): number => {
  if (type === 'followup_day_1' || type === 'send_message_day_1') return 1;
  if (type === 'followup_day_2' || type === 'send_message_a') return 2;
  if (type === 'followup_day_3' || type === 'send_message_b') return 3;
  return 1;
};

export const useTodayTasks = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tasksQuery = useQuery({
    queryKey: ['today-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date();

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, poc_id, lead_id, type, scheduled_for')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (!notifications || notifications.length === 0) return [];

      const pocIds = Array.from(new Set(notifications.map((n) => n.poc_id).filter(Boolean)));
      const leadIds = Array.from(new Set(notifications.map((n) => n.lead_id).filter(Boolean)));

      const [{ data: pocsData }, { data: leadsData }] = await Promise.all([
        supabase.from('pocs').select('id, name, linkedin_url, response_type, lead_id, invite_accepted_at, auto_removed').in('id', pocIds),
        supabase.from('leads').select('id, company_name').in('id', leadIds),
      ]);

      const pocMap = new Map((pocsData || []).map((p: any) => [p.id, p]));
      const leadMap = new Map((leadsData || []).map((l: any) => [l.id, l.company_name]));

      const formattedTasks: TodayTask[] = [];

      for (const n of notifications) {
        const poc = pocMap.get(n.poc_id);
        
        if (!poc || poc.response_type === 'negative' || poc.auto_removed) continue;
        if (!poc.invite_accepted_at) continue;

        const inviteAcceptedAt = new Date(poc.invite_accepted_at);
        const scheduledFor = new Date(n.scheduled_for);
        
        const followupDay = getFollowupDay(n.type);

        const queueEndTime = new Date(inviteAcceptedAt);
        queueEndTime.setDate(queueEndTime.getDate() + 3);
        
        if (now > queueEndTime) continue;
        if (now < scheduledFor) continue;

        formattedTasks.push({
          id: n.id,
          poc_id: n.poc_id,
          poc_name: poc.name,
          company_name: leadMap.get(n.lead_id) || 'Unknown',
          linkedin_url: poc.linkedin_url,
          type: n.type,
          scheduled_for: n.scheduled_for,
          lead_id: n.lead_id,
          invite_accepted_at: poc.invite_accepted_at,
          followup_day: followupDay,
        });
      }

      return formattedTasks;
    },
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('today-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, 
        () => queryClient.invalidateQueries({ queryKey: ['today-tasks'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pocs' }, 
        () => queryClient.invalidateQueries({ queryKey: ['today-tasks'] }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (task: TodayTask) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const followupDay = task.followup_day;

      // Fetch templates matching this followup day
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .or(`created_by.eq.${user.id},is_shared.eq.true`)
        .eq('followup_day', followupDay)
        .limit(1);

      const templateBody = templates && templates.length > 0 
        ? templates[0].body 
        : `Hi {firstName}, I wanted to follow up on my previous message regarding {company}...`;

      const firstName = task.poc_name.split(' ')[0];
      const finalMessage = templateBody
        .replace(/{firstName}/g, firstName)
        .replace(/\{firstName\}/g, firstName)
        .replace(/{company}/g, task.company_name)
        .replace(/\{company\}/g, task.company_name);

      // Copy to clipboard
      let copySuccess = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(finalMessage);
          copySuccess = true;
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = finalMessage;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          copySuccess = document.execCommand('copy');
          textArea.remove();
        }
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
      }

      // Open LinkedIn
      if (task.linkedin_url) {
        window.open(task.linkedin_url, '_blank');
      } else {
        window.open('https://www.linkedin.com/messaging/', '_blank');
      }

      // Update POC and notification
      await Promise.all([
        supabase.from('pocs').update({ last_contacted_at: new Date().toISOString() }).eq('id', task.poc_id),
        supabase.from('notifications').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', task.id),
        supabase.from('activities').insert({
          lead_id: task.lead_id,
          poc_id: task.poc_id,
          user_id: user.id,
          action: 'message_sent',
          metadata: { type: task.type, status: 'sent', followup_day: followupDay }
        })
      ]);

      return { 
        copySuccess, 
        followupDay, 
        templateName: templates && templates.length > 0 ? templates[0].name : null 
      };
    },
    onSuccess: ({ copySuccess, followupDay, templateName }) => {
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      
      if (copySuccess) {
        toast({
          title: `Day ${followupDay} message copied!`,
          description: templateName 
            ? `Using template: ${templateName}`
            : `Using default template (no Day ${followupDay} template found)`
        });
      } else {
        toast({
          title: "Message sent",
          description: "LinkedIn opened but clipboard copy failed."
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    }
  });

  const markComplete = useMutation({
    mutationFn: async (taskId: string) => {
      await supabase
        .from('notifications')
        .update({ status: 'completed', sent_at: new Date().toISOString() })
        .eq('id', taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      toast({ title: "Task completed", description: "The task has been marked as complete." });
    }
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    markComplete: markComplete.mutate,
    isMarkingComplete: markComplete.isPending,
  };
};

export const useNotificationCount = () => {
  return useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString());
      
      return count || 0;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
};

export default useTodayTasks;
