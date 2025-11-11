import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Checking for POCs with accepted invites that need follow-up scheduling...')

    // Find POCs where invite was accepted and no follow-up notifications exist yet
    const { data: pocsNeedingFollowup, error: pocsError } = await supabaseClient
      .from('pocs')
      .select('id, lead_id, invite_accepted_at, linkedin_invite_accepted')
      .eq('linkedin_invite_accepted', true)
      .eq('auto_removed', false)
      .not('invite_accepted_at', 'is', null)

    if (pocsError) {
      console.error('Error fetching POCs:', pocsError)
      throw pocsError
    }

    console.log(`Found ${pocsNeedingFollowup?.length || 0} POCs with accepted invites`)

    let scheduledCount = 0

    for (const poc of pocsNeedingFollowup || []) {
      // Check if follow-up notifications already exist
      const { data: existingNotifs } = await supabaseClient
        .from('notifications')
        .select('id, type')
        .eq('poc_id', poc.id)
        .in('type', ['send_message_a', 'send_message_b'])

      // If follow-ups already scheduled, skip
      if (existingNotifs && existingNotifs.length >= 2) {
        continue
      }

      const existingTypes = new Set(existingNotifs?.map(n => n.type) || [])

      // Get the lead to find the user_id
      const { data: lead } = await supabaseClient
        .from('leads')
        .select('created_by')
        .eq('id', poc.lead_id)
        .single()

      if (!lead) continue

      const inviteAcceptedDate = new Date(poc.invite_accepted_at)
      const notifications = []

      // Day 2 - First follow-up (24 hours after invite acceptance)
      if (!existingTypes.has('send_message_a')) {
        const day2 = new Date(inviteAcceptedDate)
        day2.setDate(day2.getDate() + 1)
        notifications.push({
          user_id: lead.created_by,
          lead_id: poc.lead_id,
          poc_id: poc.id,
          type: 'send_message_a',
          scheduled_for: day2.toISOString(),
          status: 'pending'
        })
      }

      // Day 3 - Second follow-up (48 hours after invite acceptance)
      if (!existingTypes.has('send_message_b')) {
        const day3 = new Date(inviteAcceptedDate)
        day3.setDate(day3.getDate() + 2)
        notifications.push({
          user_id: lead.created_by,
          lead_id: poc.lead_id,
          poc_id: poc.id,
          type: 'send_message_b',
          scheduled_for: day3.toISOString(),
          status: 'pending'
        })
      }

      if (notifications.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('notifications')
          .insert(notifications)

        if (insertError) {
          console.error(`Error scheduling follow-ups for POC ${poc.id}:`, insertError)
        } else {
          scheduledCount += notifications.length
          console.log(`Scheduled ${notifications.length} follow-ups for POC ${poc.id}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled ${scheduledCount} follow-up notifications`,
        pocsChecked: pocsNeedingFollowup?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in schedule-followups:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
