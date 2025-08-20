import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GerarProvaFormProps {
  onGenerate: (prova: any) => void;
  isLoading: boolean;
}

export const GerarProvaForm = ({ onGenerate, isLoading }: GerarProvaFormProps) => {
  const [tema, setTema] = useState("");
  const [serie, setSerie] = useState("");
  const [questoes, setQuestoes] = useState("10");
  const [tipo, setTipo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tema || !serie || !tipo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha tema, série e tipo de prova",
        variant: "destructive",
      });
      return;
    }

    const provaData = {
      tema,
      serie,
      questoes: parseInt(questoes),
      tipo,
      observacoes,
    };

    onGenerate(provaData);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Gerar Nova Prova</span>
        </CardTitle>
        <CardDescription>
          Preencha os dados abaixo para gerar uma prova personalizada com IA
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema da Prova *</Label>
              <Input
                id="tema"
                placeholder="Ex: Matemática - Funções Quadráticas"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serie">Série/Ano *</Label>
              <Select value={serie} onValueChange={setSerie} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6-fundamental">6º Ano - Fundamental</SelectItem>
                  <SelectItem value="7-fundamental">7º Ano - Fundamental</SelectItem>
                  <SelectItem value="8-fundamental">8º Ano - Fundamental</SelectItem>
                  <SelectItem value="9-fundamental">9º Ano - Fundamental</SelectItem>
                  <SelectItem value="1-medio">1º Ano - Médio</SelectItem>
                  <SelectItem value="2-medio">2º Ano - Médio</SelectItem>
                  <SelectItem value="3-medio">3º Ano - Médio</SelectItem>
                  <SelectItem value="superior">Ensino Superior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questoes">Quantidade de Questões</Label>
              <Select value={questoes} onValueChange={setQuestoes} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 questões</SelectItem>
                  <SelectItem value="10">10 questões</SelectItem>
                  <SelectItem value="15">15 questões</SelectItem>
                  <SelectItem value="20">20 questões</SelectItem>
                  <SelectItem value="25">25 questões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Prova *</Label>
              <Select value={tipo} onValueChange={setTipo} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multipla-escolha">Múltipla Escolha</SelectItem>
                  <SelectItem value="verdadeiro-falso">Verdadeiro ou Falso</SelectItem>
                  <SelectItem value="dissertativa">Dissertativa</SelectItem>
                  <SelectItem value="mista">Mista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Adicionais</Label>
            <Textarea
              id="observacoes"
              placeholder="Instruções específicas, tópicos a focar, dificuldade desejada..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full gradient-hero shadow-primary"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando Prova...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Prova com IA
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};