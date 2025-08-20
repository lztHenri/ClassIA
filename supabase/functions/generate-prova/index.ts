import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both old format and new chat format
    let tema, serie, questoes, tipo, prompt;
    
    if (body.prompt) {
      // New chat format - use the prompt directly
      prompt = body.prompt;
      // Set defaults for database storage
      tema = "Chat Generated";
      serie = "N/A";
      questoes = 10;
      tipo = "multipla_escolha";
    } else {
      // Old format compatibility
      ({ tema, serie, questoes, tipo } = body);
    }
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check user's profile and plan limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check plan limits
    const limits = {
      free: 10,
      pro: 100,
      institucional: -1 // unlimited
    };

    const userLimit = limits[profile.plan as keyof typeof limits];
    if (userLimit !== -1 && profile.provas_utilizadas >= userLimit) {
      return new Response(
        JSON.stringify({ error: 'Limite de provas excedido para seu plano' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate prompt based on type
    let tipoTexto = '';
    switch (tipo) {
      case 'multipla_escolha':
        tipoTexto = 'múltipla escolha com 4 alternativas (A, B, C, D)';
        break;
      case 'verdadeiro_falso':
        tipoTexto = 'verdadeiro ou falso';
        break;
      case 'dissertativa':
        tipoTexto = 'dissertativas com resposta discursiva';
        break;
      case 'mista':
        tipoTexto = 'mistas (múltipla escolha, verdadeiro/falso e dissertativas)';
        break;
    }

    let promptContent;
    
    if (prompt) {
      // New chat format - use user's prompt directly with system instructions
      promptContent = `${prompt}

Por favor, gere a prova no seguinte formato JSON válido:
{
  "titulo": "Prova de [TEMA]",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "pergunta aqui",
      "tipo": "multipla_escolha",
      "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "resposta_correta": "A"
    }
  ],
  "gabarito": {
    "1": "A",
    "2": "V",
    "3": "Resposta dissertativa esperada..."
  }
}

INSTRUÇÕES:
- Para múltipla escolha: 4 alternativas (A, B, C, D) com apenas uma correta
- Para verdadeiro/falso: Questões que podem ser respondidas com V (Verdadeiro) ou F (Falso)
- Para dissertativas: Perguntas abertas
- Crie questões de qualidade acadêmica

Retorne APENAS o JSON válido, sem texto adicional.`;
    } else {
      // Old format compatibility
      promptContent = `Você é um assistente especializado em criar provas educacionais. 

Gere uma prova sobre "${tema}" para "${serie}" com ${questoes} questões do tipo ${tipoTexto}.

INSTRUÇÕES ESPECÍFICAS:
- Para múltipla escolha: Forneça 4 alternativas (A, B, C, D) com apenas uma correta
- Para verdadeiro/falso: Questões claras que podem ser respondidas com V ou F
- Para dissertativas: Perguntas abertas que exigem desenvolvimento de resposta
- Para mistas: Combine os tipos de forma equilibrada

FORMATO DE RESPOSTA (JSON):
{
  "titulo": "Prova de [tema]",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "pergunta aqui",
      "tipo": "multipla_escolha",
      "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."], // apenas para múltipla escolha
      "resposta_correta": "A"
    }
  ],
  "gabarito": {
    "1": "A",
    "2": "V",
    "3": "Resposta dissertativa esperada..."
  }
}

Crie questões de qualidade acadêmica apropriadas para o nível educacional solicitado.`;
    }

    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente especializado em criar provas educacionais. Sempre responda em JSON válido.' 
          },
          { role: 'user', content: promptContent }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    
    console.log('Generated content:', generatedContent);

    // Parse the JSON response from OpenAI
    let provaData;
    try {
      provaData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', generatedContent);
      throw new Error('Failed to parse generated content');
    }

    // Save to database
    const { data: savedProva, error: saveError } = await supabase
      .from('provas')
      .insert({
        user_id: user.id,
        titulo: provaData.titulo,
        tema,
        serie,
        questoes: parseInt(questoes),
        tipo,
        conteudo: provaData
      })
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      throw new Error('Failed to save prova');
    }

    // Update user's prova count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        provas_utilizadas: profile.provas_utilizadas + 1 
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update prova count:', updateError);
    }

    console.log('Prova generated successfully:', savedProva.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        prova: savedProva,
        provas_restantes: userLimit === -1 ? null : userLimit - (profile.provas_utilizadas + 1)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-prova function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});