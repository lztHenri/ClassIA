import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileText, TrendingUp, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  name: string;
  email: string;
  plan: string;
  provas_utilizadas: number;
  created_at: string;
}

interface ProvaStats {
  total_provas: number;
  provas_hoje: number;
  usuarios_ativos: number;
}

const Admin = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<ProvaStats>({
    total_provas: 0,
    provas_hoje: 0,
    usuarios_ativos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin (simplified check - in production you'd have a proper role system)
    if (!user || !user.email?.includes('admin')) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área",
        variant: "destructive"
      });
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      // Load all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load statistics
      const { count: totalProvas } = await supabase
        .from('provas')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: provasHoje } = await supabase
        .from('provas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      const { count: usuariosAtivos } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('provas_utilizadas', 0);

      setProfiles(profilesData || []);
      setStats({
        total_provas: totalProvas || 0,
        provas_hoje: provasHoje || 0,
        usuarios_ativos: usuariosAtivos || 0
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados administrativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-500';
      case 'pro': return 'bg-blue-500';
      case 'institucional': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanLimit = (plan: string) => {
    switch (plan) {
      case 'free': return 10;
      case 'pro': return 100;
      case 'institucional': return 'Ilimitado';
      default: return 10;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar user={user ? { name: user.email || '', email: user.email || '' } : undefined} onLogin={() => {}} onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar user={user ? { name: user.email || '', email: user.email || '' } : undefined} onLogin={() => {}} onLogout={handleLogout} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-montserrat font-bold">
                Dashboard Administrativo
              </h1>
              <p className="text-muted-foreground">
                Monitore usuários e estatísticas da plataforma
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Provas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_provas}</div>
              <p className="text-xs text-muted-foreground">
                {stats.provas_hoje} geradas hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usuarios_ativos}</div>
              <p className="text-xs text-muted-foreground">
                com provas geradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
              <p className="text-xs text-muted-foreground">
                cadastrados na plataforma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
            <CardDescription>
              Lista completa de usuários e seus planos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Provas Utilizadas</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <Badge className={getPlanColor(profile.plan)}>
                        {profile.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile.provas_utilizadas} / {getPlanLimit(profile.plan)}
                    </TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;