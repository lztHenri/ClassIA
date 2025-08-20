import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import classIALogo from "@/assets/class-ia-logo.png";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Navbar */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={classIALogo} 
              alt="Class IA Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-montserrat text-xl font-bold text-foreground">
              Class IA
            </span>
          </div>
          <Button className="gradient-hero" onClick={() => navigate('/auth')}>
            Entrar
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="space-y-6 mb-12">
            <h1 className="text-5xl font-montserrat font-bold gradient-hero bg-clip-text text-transparent">
              Class IA
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Gere provas e atividades personalizadas em segundos com Inteligência Artificial. 
              Economize tempo e melhore a qualidade do ensino.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="shadow-card">
              <CardHeader>
                <Sparkles className="h-8 w-8 text-primary mx-auto" />
                <CardTitle>IA Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Questões criadas por IA de última geração, adaptadas ao nível e tema desejado
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <Clock className="h-8 w-8 text-primary mx-auto" />
                <CardTitle>Economia de Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  De horas para segundos. Gere provas completas com gabarito instantaneamente
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mx-auto" />
                <CardTitle>Múltiplos Formatos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Múltipla escolha, dissertativa, V/F ou mista. Exporte em PDF ou Word
                </p>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" className="gradient-hero shadow-primary" onClick={() => navigate('/auth')}>
            Comece Gratuitamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;