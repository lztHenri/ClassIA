import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { ProvaCard } from "@/components/ProvaCard";
import { ProvaViewer } from "@/components/ProvaViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Settings, HelpCircle, Crown, CreditCard, Check } from "lucide-react";
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
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [provas, setProvas] = useState<Prova[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProva, setSelectedProva] = useState<Prova | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

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
    <div className="h-screen flex flex-col p-6">
      <ChatInterface />
    </div>
  );

  // Histórico Component
  const HistoricoView = () => (
    <div className="p-6">
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
            <div className="grid gap-4">
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
    <div className="p-6">
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
          <div className="grid gap-4">
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
    <div className="p-6">
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

  // Assinatura Component
  const AssinaturaView = () => (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Gerenciar Assinatura
          </CardTitle>
          <CardDescription>
            Escolha o plano que melhor se adapta às suas necessidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Plano Gratuito */}
            <Card className={`relative ${profile?.plan === 'free' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Gratuito</CardTitle>
                  {profile?.plan === 'free' && (
                    <Badge variant="default">Atual</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-muted-foreground">R$ 0</div>
                <CardDescription>Para começar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    10 provas por mês
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Todos os tipos de questão
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Suporte por email
                  </li>
                </ul>
                <Button 
                  variant={profile?.plan === 'free' ? 'outline' : 'default'} 
                  className="w-full"
                  disabled={profile?.plan === 'free'}
                >
                  {profile?.plan === 'free' ? 'Plano Atual' : 'Escolher Gratuito'}
                </Button>
              </CardContent>
            </Card>

            {/* Plano Pro */}
            <Card className={`relative ${profile?.plan === 'pro' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pro</CardTitle>
                  {profile?.plan === 'pro' && (
                    <Badge variant="default">Atual</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">R$ 29,90</div>
                <CardDescription>Por mês</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    100 provas por mês
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Todos os tipos de questão
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Suporte prioritário
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Histórico completo
                  </li>
                </ul>
                <Button 
                  variant={profile?.plan === 'pro' ? 'outline' : 'default'} 
                  className="w-full"
                  disabled={profile?.plan === 'pro'}
                  onClick={() => {
                    toast({
                      title: "Em breve",
                      description: "Integração com Asaas será configurada em breve",
                    });
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {profile?.plan === 'pro' ? 'Plano Atual' : 'Assinar Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Plano Institucional */}
            <Card className={`relative ${profile?.plan === 'institucional' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Institucional</CardTitle>
                  {profile?.plan === 'institucional' && (
                    <Badge variant="default">Atual</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">R$ 99,90</div>
                <CardDescription>Por mês</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Provas ilimitadas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Todos os tipos de questão
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Suporte dedicado
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Múltiplos usuários
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    API personalizada
                  </li>
                </ul>
                <Button 
                  variant={profile?.plan === 'institucional' ? 'outline' : 'default'} 
                  className="w-full"
                  disabled={profile?.plan === 'institucional'}
                  onClick={() => {
                    toast({
                      title: "Em breve",
                      description: "Integração com Asaas será configurada em breve",
                    });
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {profile?.plan === 'institucional' ? 'Plano Atual' : 'Assinar Institucional'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {profile?.plan !== 'free' && (
            <div className="mt-8 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-medium mb-2">Informações da Assinatura</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Plano atual: <span className="font-medium">{getPlanoInfo().nome}</span></p>
                <p>Próxima cobrança: Em breve (integração Asaas)</p>
                <p>Método de pagamento: A configurar</p>
              </div>
              <Button variant="outline" size="sm" className="mt-3">
                Cancelar Assinatura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
      
      <div className="flex-1 md:ml-64">
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