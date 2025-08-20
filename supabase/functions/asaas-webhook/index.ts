import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    customer: string;
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData: AsaasWebhookPayload = await req.json();
    
    console.log('Webhook received:', JSON.stringify(webhookData, null, 2));

    const { event, payment } = webhookData;

    // Update transaction status
    const { error: transactionError } = await supabase
      .from('transactions')
      .update({ 
        status: payment.status.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', payment.id);

    if (transactionError) {
      console.error('Error updating transaction:', transactionError);
    }

    // If payment was confirmed, update user subscription
    if (event === 'PAYMENT_CONFIRMED' || payment.status === 'RECEIVED') {
      // Get transaction to find user
      const { data: transaction, error: getTransactionError } = await supabase
        .from('transactions')
        .select('user_id, plan')
        .eq('asaas_payment_id', payment.id)
        .single();

      if (getTransactionError) {
        console.error('Error getting transaction:', getTransactionError);
        return new Response(JSON.stringify({ error: 'Transaction not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Calculate subscription end date (30 days from now)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

      // Update user profile with subscription
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: transaction.plan,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', transaction.user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      } else {
        console.log(`User ${transaction.user_id} subscription activated for plan: ${transaction.plan}`);
      }
    }

    // If payment failed or was cancelled, handle accordingly
    if (event === 'PAYMENT_OVERDUE' || payment.status === 'OVERDUE') {
      const { data: transaction, error: getTransactionError } = await supabase
        .from('transactions')
        .select('user_id')
        .eq('asaas_payment_id', payment.id)
        .single();

      if (!getTransactionError && transaction) {
        // Optionally handle overdue payments (send notifications, etc.)
        console.log(`Payment overdue for user: ${transaction.user_id}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in asaas-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);