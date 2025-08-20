import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Download, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProvaCardProps {
  id: string;
  titulo: string;
  tema: string;
  serie: string;
  questoes: number;
  tipo: string;
  dataGeracao: string;
  onView: (id: string) => void;
  onDownload: (id: string) => void;
}

export const ProvaCard = ({ 
  id, 
  titulo, 
  tema, 
  serie, 
  questoes, 
  tipo, 
  dataGeracao, 
  onView, 
  onDownload 
}: ProvaCardProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(`Prova: ${titulo}\nTema: ${tema}\nSérie: ${serie}`);
    toast({
      title: "Copiado!",
      description: "Informações da prova copiadas para a área de transferência",
    });
  };

  return (
    <Card className="hover:shadow-elevated transition-smooth cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg font-montserrat group-hover:text-primary transition-smooth">
              {titulo}
            </CardTitle>
            <CardDescription className="font-medium">
              {tema}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {tipo}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Série:</span>
            <span className="font-medium">{serie}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">Questões:</span>
            <span className="font-medium">{questoes}</span>
          </div>
          <div className="flex items-center space-x-2 col-span-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Gerada em:</span>
            <span className="font-medium">{dataGeracao}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-3 border-t">
        <Button variant="outline" size="sm" onClick={() => onView(id)}>
          Visualizar
        </Button>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDownload(id)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};