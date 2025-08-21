import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  plan: 'pro' | 'institutional';
}

const plans = {
  pro: {
    name: 'Plano Pro',
    value: 29.90,
    features: ['Até 100 provas por mês', 'Suporte prioritário', 'Formatos avançados']
  },
  institutional: {
    name: 'Plano Institucional',
    value: 99.90,
    features: ['Provas ilimitadas', 'Gestão de equipes', 'Relatórios detalhados', 'Suporte dedicado']
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
    
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { plan }: PaymentRequest = await req.json();

    if (!plans[plan]) {
      return new Response(JSON.stringify({ error: 'Plano inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar perfil do usuário' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let customerId = profile.asaas_customer_id;

    // Create customer in Asaas if doesn't exist
    if (!customerId) {
      // Use production URL instead of sandbox
      const customerResponse = await fetch('https://www.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          // Don't send CPF/CNPJ for now to avoid validation errors
        }),
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.text();
        console.error('Customer creation error:', errorData);
        throw new Error('Erro ao criar cliente no Asaas');
      }

      const customerData = await customerResponse.json();
      customerId = customerData.id;

      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ asaas_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Create payment in Asaas
    const paymentResponse = await fetch('https://www.asaas.com/api/v3/payments', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        value: plans[plan].value,
        description: `Assinatura ${plans[plan].name} - Class IA`,
        externalReference: `${user.id}-${plan}-${Date.now()}`,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      console.error('Payment creation error:', errorData);
      throw new Error('Erro ao criar pagamento no Asaas');
    }

    const paymentData = await paymentResponse.json();

    // Save transaction in database
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        asaas_payment_id: paymentData.id,
        amount: plans[plan].value,
        status: 'pending',
        plan: plan,
      });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
    }

    // Return payment URL for PIX or credit card
    return new Response(JSON.stringify({
      paymentId: paymentData.id,
      paymentUrl: paymentData.invoiceUrl,
      qrCode: paymentData.qrCode,
      status: paymentData.status,
      plan: plan,
      amount: plans[plan].value,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in asaas-payment function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);