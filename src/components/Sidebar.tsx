import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X, 
  MessageSquare, 
  History, 
  Settings, 
  HelpCircle,
  Crown,
  User
} from "lucide-react";
import classIALogo from "@/assets/class-ia-logo.png";

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    plan?: string;
    provas_utilizadas?: number;
  };
  onLogout: () => void;
}

export const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const getPlanoInfo = () => {
    if (!user) return { nome: "Gratuito", limite: "10 provas/mês", restantes: 10, cor: "bg-gray-500" };
    
    switch (user.plan) {
      case "free":
        return { 
          nome: "Gratuito", 
          limite: "10 provas/mês", 
          restantes: 10 - (user.provas_utilizadas || 0), 
          cor: "bg-gray-500" 
        };
      case "pro":
        return { 
          nome: "Pro", 
          limite: "100 provas/mês", 
          restantes: 100 - (user.provas_utilizadas || 0), 
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
          restantes: 10 - (user.provas_utilizadas || 0), 
          cor: "bg-gray-500" 
        };
    }
  };

  const menuItems = [
    {
      title: "Gerar Provas",
      href: "/dashboard",
      icon: MessageSquare,
      description: "Interface de chat para gerar provas"
    },
    {
      title: "Histórico de Provas",
      href: "/dashboard/historico",
      icon: History,
      description: "Ver provas já geradas"
    },
    {
      title: "Configurações da Conta",
      href: "/dashboard/configuracoes",
      icon: Settings,
      description: "Gerenciar preferências"
    },
    {
      title: "Ajuda / Sobre o Class IA",
      href: "/dashboard/ajuda",
      icon: HelpCircle,
      description: "Suporte e informações"
    },
    {
      title: "Assinatura",
      href: "/dashboard/assinatura",
      icon: Crown,
      description: "Gerenciar planos e pagamentos"
    }
  ];

  const planoInfo = getPlanoInfo();

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:bg-sidebar-background md:border-r md:border-sidebar-border">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center space-x-3 p-6 border-b border-sidebar-border">
            <img 
              src={classIALogo} 
              alt="Class IA Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-montserrat text-xl font-bold text-sidebar-foreground">
              Class IA
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-smooth ${
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-sidebar-foreground/60 truncate">{item.description}</div>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* User Info & Plan */}
          <div className="p-4 border-t border-sidebar-border space-y-4">
            {/* Plan Info */}
            <Card className="p-3 bg-sidebar-accent/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-sidebar-foreground">Plano Atual</span>
                <Crown className="h-4 w-4 text-sidebar-primary" />
              </div>
              <Badge className={planoInfo.cor}>{planoInfo.nome}</Badge>
              <p className="text-xs text-sidebar-foreground/60 mt-1">{planoInfo.limite}</p>
              {planoInfo.restantes !== null && (
                <p className="text-sm font-medium text-sidebar-foreground">
                  {planoInfo.restantes} provas restantes
                </p>
              )}
            </Card>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user?.email || 'email@exemplo.com'}
                </p>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="w-full"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar-background border-r border-sidebar-border">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <div className="flex items-center space-x-3">
                  <img 
                    src={classIALogo} 
                    alt="Class IA Logo" 
                    className="w-8 h-8 object-contain"
                  />
                  <span className="font-montserrat text-xl font-bold text-sidebar-foreground">
                    Class IA
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-smooth ${
                        isActive 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        <div className="text-xs text-sidebar-foreground/60 truncate">{item.description}</div>
                      </div>
                    </NavLink>
                  );
                })}
              </nav>

              {/* User Info & Plan */}
              <div className="p-4 border-t border-sidebar-border space-y-4">
                {/* Plan Info */}
                <Card className="p-3 bg-sidebar-accent/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-sidebar-foreground">Plano Atual</span>
                    <Crown className="h-4 w-4 text-sidebar-primary" />
                  </div>
                  <Badge className={planoInfo.cor}>{planoInfo.nome}</Badge>
                  <p className="text-xs text-sidebar-foreground/60 mt-1">{planoInfo.limite}</p>
                  {planoInfo.restantes !== null && (
                    <p className="text-sm font-medium text-sidebar-foreground">
                      {planoInfo.restantes} provas restantes
                    </p>
                  )}
                </Card>

                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {user?.email || 'email@exemplo.com'}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onLogout}
                  className="w-full"
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};