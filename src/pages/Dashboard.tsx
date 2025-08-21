import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { ProvaCard } from "@/components/ProvaCard";
import { ProvaViewer } from "@/components/ProvaViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Settings, HelpCircle, Crown, CreditCard, Check, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Prova {
  id: string;
  titulo: string;
  tema: string;
  serie: string;
  questoes: number;
  tipo: string;
  dataGeracao: string;
  conteudo: any;
}

interface Profile {
  plan: string;
  provas_utilizadas: number;
  name: string;
  email: string;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  asaas_customer_id?: string;
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [provas, setProvas] = useState<Prova[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProva, setSelectedProva] = useState<Prova | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (profileError) throw profileError;

      // Load user's provas
      const { data: provasData, error: provasError } = await supabase
        .from('provas')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (provasError) throw provasError;

      const formattedProvas = provasData?.map(prova => ({
        id: prova.id,
        titulo: prova.titulo,
        tema: prova.tema,
        serie: prova.serie,
        questoes: prova.questoes,
        tipo: prova.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 
              prova.tipo === 'verdadeiro_falso' ? 'Verdadeiro/Falso' :
              prova.tipo === 'dissertativa' ? 'Dissertativa' : 'Mista',
        dataGeracao: new Date(prova.created_at).toLocaleDateString('pt-BR'),
        conteudo: prova.conteudo
      })) || [];

      setProfile(profileData);
      setProvas(formattedProvas);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do usuário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };


  const handleViewProva = (id: string) => {
    const prova = provas.find(p => p.id === id);
    if (prova) {
      setSelectedProva(prova);
      setIsViewerOpen(true);
    }
  };

  const handleDownloadProva = (id: string) => {
    const prova = provas.find(p => p.id === id);
    if (!prova) return;

    // Generate PDF content
    const pdfContent = generatePDFContent(prova);
    
    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prova.titulo.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download concluído",
      description: `Prova ${prova.titulo} baixada com sucesso`,
    });
  };

  const generatePDFContent = (prova: Prova) => {
    let content = `${prova.titulo}\n`;
    content += `Tema: ${prova.tema}\n`;
    content += `Série: ${prova.serie}\n`;
    content += `Data: ${prova.dataGeracao}\n`;
    content += `\n${'='.repeat(50)}\n\n`;

    prova.conteudo.questoes.forEach((questao: any) => {
      content += `Questão ${questao.numero}:\n`;
      content += `${questao.enunciado}\n\n`;
      
      if (questao.alternativas) {
        questao.alternativas.forEach((alt: string, index: number) => {
          const letra = String.fromCharCode(65 + index);
          content += `${letra}) ${alt.replace(/^[A-D]\)\s*/, '')}\n`;
        });
      }
      
      if (questao.tipo === 'verdadeiro_falso') {
        content += `( ) Verdadeiro\n( ) Falso\n`;
      }
      
      content += '\n';
    });

    content += `\n${'='.repeat(50)}\n`;
    content += `GABARITO:\n\n`;
    
    Object.entries(prova.conteudo.gabarito).forEach(([numero, resposta]) => {
      content += `${numero}: ${resposta}\n`;
    });

    return content;
  };

  const getPlanoInfo = () => {
    if (!profile) return { nome: "Gratuito", limite: "10 provas/mês", restantes: 10, cor: "bg-gray-500" };
    
    switch (profile.plan) {
      case "free":
        return { 
          nome: "Gratuito", 
          limite: "10 provas/mês", 
          restantes: 10 - profile.provas_utilizadas, 
          cor: "bg-gray-500" 
        };
      case "pro":
        return { 
          nome: "Pro", 
          limite: "100 provas/mês", 
          restantes: 100 - profile.provas_utilizadas, 
          cor: "bg-blue-500" 
        };
      case "institucional":
        return { 
          nome: "Institucional", 
          limite: "Ilimitado", 
          restantes: null, 
          cor: "bg-yellow-500" 
        };
      default:
        return { 
          nome: "Gratuito", 
          limite: "10 provas/mês", 
          restantes: 10 - profile.provas_utilizadas, 
          cor: "bg-gray-500" 
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  const planoInfo = getPlanoInfo();

  // Main Chat Interface Component
  const ChatInterfaceView = () => (
    <div className="h-screen flex flex-col p-3 md:p-6">
      <ChatInterface />
    </div>
  );

  // Histórico Component
  const HistoricoView = () => (
    <div className="p-3 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Provas</CardTitle>
          <CardDescription>
            Suas provas geradas recentemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {provas.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma prova gerada ainda. Comece criando sua primeira prova!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {provas.map((prova) => (
                <ProvaCard
                  key={prova.id}
                  {...prova}
                  onView={handleViewProva}
                  onDownload={handleDownloadProva}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Configurações Component
  const ConfiguracoesView = () => (
    <div className="p-3 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações da Conta
          </CardTitle>
          <CardDescription>
            Gerencie suas preferências e informações da conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <div className="p-3 border rounded-md bg-muted/50">
                {profile?.name || 'Nome não informado'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="p-3 border rounded-md bg-muted/50">
                {profile?.email || 'Email não informado'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plano Atual</label>
              <div className="p-3 border rounded-md bg-muted/50 flex items-center gap-2">
                <Badge className={getPlanoInfo().cor}>{getPlanoInfo().nome}</Badge>
                <span className="text-sm text-muted-foreground">
                  {getPlanoInfo().limite}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provas Utilizadas</label>
              <div className="p-3 border rounded-md bg-muted/50">
                {profile?.provas_utilizadas || 0} provas geradas
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Ajuda Component
  const AjudaView = () => (
    <div className="p-3 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Ajuda / Sobre o Class IA
          </CardTitle>
          <CardDescription>
            Suporte e informações sobre a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Como usar o Class IA</h3>
              <p className="text-sm text-muted-foreground">
                Digite suas solicitações na interface de chat para gerar provas personalizadas com IA. 
                Exemplo: "Crie uma prova de matemática com 10 questões sobre frações".
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Tipos de prova suportados</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Múltipla escolha</li>
                <li>Verdadeiro ou falso</li>
                <li>Dissertativas</li>
                <li>Provas mistas</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Limites dos planos</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Gratuito: 10 provas por mês</li>
                <li>Pro: 100 provas por mês</li>
                <li>Institucional: Provas ilimitadas</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Suporte</h3>
              <p className="text-sm text-muted-foreground">
                Para dúvidas ou problemas, entre em contato através do email: suporte@classia.com.br
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const handleSubscription = async (plan: 'pro' | 'institutional') => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar um plano.",
        variant: "destructive"
      });
      return;
    }

    if (plan === 'pro') {
      // Link real do plano Pro
      const paymentUrl = 'https://www.asaas.com/c/xmqwmtgw5llu8bte';
      window.open(paymentUrl, '_blank');
      
      toast({
        title: "Redirecionando para pagamento",
        description: "Uma nova aba foi aberta com os detalhes do pagamento. Após o pagamento, seu plano será ativado automaticamente.",
      });
    } else if (plan === 'institutional') {
      // Para plano institucional, redirecionar para contato
      toast({
        title: "Plano Institucional",
        description: "Entre em contato através do email: suporte@classia.com.br para mais informações sobre o plano institucional.",
      });
    }
  };

  const getSubscriptionStatus = () => {
    if (!profile) return { status: 'free', plan: 'Free', maxProvas: 5 };
    
    const { subscription_status, subscription_plan, subscription_end_date } = profile;
    
    if (subscription_status === 'active' && subscription_end_date) {
      const endDate = new Date(subscription_end_date);
      const now = new Date();
      
      if (endDate > now) {
        const planName = subscription_plan === 'pro' ? 'Pro' : 'Institucional';
        const maxProvas = subscription_plan === 'pro' ? 100 : 'Ilimitadas';
        return { status: 'active', plan: planName, maxProvas, endDate };
      }
    }
    
    return { status: 'free', plan: 'Free', maxProvas: 5 };
  };

  const subscriptionStatus = getSubscriptionStatus();

  // Assinatura Component
  const AssinaturaView = () => (
    <div className="max-w-4xl mx-auto p-3 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Assinatura</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Plano Pro */}
        <div className="border border-border rounded-lg p-4 md:p-6 bg-card">
          <div className="text-center mb-4 md:mb-6">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Plano Pro</h3>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-4">
              R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
          </div>
          
          <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Até 100 provas por mês</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Suporte prioritário</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Formatos avançados de prova</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Histórico completo</span>
            </li>
          </ul>
          
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => handleSubscription('pro')}
            disabled={isProcessingPayment || subscriptionStatus.status === 'active'}
          >
            {subscriptionStatus.status === 'active' && subscriptionStatus.plan === 'Pro' 
              ? 'Plano Ativo' 
              : isProcessingPayment 
                ? 'Processando...' 
                : 'Assinar Plano Pro'
            }
          </Button>
        </div>

        {/* Plano Institucional */}
        <div className="border border-border rounded-lg p-4 md:p-6 bg-card relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-primary-foreground px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium">
              Mais Popular
            </span>
          </div>
          
          <div className="text-center mb-4 md:mb-6 mt-2">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Plano Institucional</h3>
            <div className="text-xl md:text-2xl font-bold text-primary mb-4">
              Consultar Atendente
            </div>
          </div>
          
          <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Provas ilimitadas</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Gestão de equipes</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Relatórios detalhados</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">Suporte dedicado 24/7</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2 md:mr-3 flex-shrink-0" />
              <span className="text-sm md:text-base">API para integração</span>
            </li>
          </ul>
          
          <Button 
            className="w-full" 
            size="lg" 
            variant="default"
            onClick={() => handleSubscription('institutional')}
            disabled={isProcessingPayment || subscriptionStatus.status === 'active'}
          >
            {subscriptionStatus.status === 'active' && subscriptionStatus.plan === 'Institucional' 
              ? 'Plano Ativo' 
              : isProcessingPayment 
                ? 'Processando...' 
                : 'Consultar Atendente'
            }
          </Button>
        </div>
      </div>
      
      <div className="mt-6 md:mt-8 p-3 md:p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2 text-sm md:text-base">Status da Assinatura</h4>
        <p className="text-muted-foreground text-sm md:text-base">
          Plano {subscriptionStatus.plan} - {subscriptionStatus.maxProvas} provas
          {subscriptionStatus.endDate && subscriptionStatus.status === 'active' && (
            <span className="block text-xs md:text-sm mt-1">
              Válido até: {new Date(subscriptionStatus.endDate).toLocaleDateString('pt-BR')}
            </span>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        user={profile ? { 
          name: profile.name, 
          email: profile.email, 
          plan: profile.plan,
          provas_utilizadas: profile.provas_utilizadas 
        } : undefined} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 md:ml-64 w-full overflow-x-hidden">
        <Routes>
          <Route index element={<ChatInterfaceView />} />
          <Route path="historico" element={<HistoricoView />} />
          <Route path="configuracoes" element={<ConfiguracoesView />} />
          <Route path="ajuda" element={<AjudaView />} />
          <Route path="assinatura" element={<AssinaturaView />} />
        </Routes>
      </div>

      <ProvaViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        prova={selectedProva}
        onDownload={() => selectedProva && handleDownloadProva(selectedProva.id)}
      />
    </div>
  );
};

export default Dashboard;