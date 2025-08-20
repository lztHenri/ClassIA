import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText } from "lucide-react";

interface Questao {
  numero: number;
  enunciado: string;
  tipo: string;
  alternativas?: string[];
  resposta_correta?: string;
}

interface ProvaData {
  titulo: string;
  questoes: Questao[];
  gabarito: Record<string, string>;
}

interface ProvaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  prova: {
    id: string;
    titulo: string;
    tema: string;
    serie: string;
    questoes: number;
    tipo: string;
    dataGeracao: string;
    conteudo: ProvaData;
  } | null;
  onDownload: () => void;
}

export const ProvaViewer = ({ isOpen, onClose, prova, onDownload }: ProvaViewerProps) => {
  if (!prova) return null;

  const getTipoQuestao = (tipo: string) => {
    switch (tipo) {
      case 'multipla_escolha':
        return 'Múltipla Escolha';
      case 'verdadeiro_falso':
        return 'Verdadeiro/Falso';
      case 'dissertativa':
        return 'Dissertativa';
      default:
        return tipo;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{prova.titulo}</span>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </DialogTitle>
          <DialogDescription>
            {prova.tema} • {prova.serie} • {prova.questoes} questões • {prova.dataGeracao}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {prova.conteudo.questoes.map((questao) => (
              <div key={questao.numero} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">Questão {questao.numero}</h3>
                  <Badge variant="secondary">{getTipoQuestao(questao.tipo)}</Badge>
                </div>
                
                <p className="mb-4 text-sm leading-relaxed">{questao.enunciado}</p>
                
                {questao.alternativas && (
                  <div className="space-y-2">
                    {questao.alternativas.map((alternativa, index) => {
                      const letra = String.fromCharCode(65 + index);
                      const isCorrect = questao.resposta_correta === letra;
                      return (
                        <div 
                          key={index} 
                          className={`p-2 rounded text-sm ${
                            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-muted/30'
                          }`}
                        >
                          {alternativa}
                          {isCorrect && (
                            <span className="ml-2 text-green-600 font-medium">(Correta)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {questao.tipo === 'verdadeiro_falso' && (
                  <div className="space-y-2">
                    <div className={`p-2 rounded text-sm ${
                      questao.resposta_correta === 'V' ? 'bg-green-50 border border-green-200' : 'bg-muted/30'
                    }`}>
                      Verdadeiro
                      {questao.resposta_correta === 'V' && (
                        <span className="ml-2 text-green-600 font-medium">(Correta)</span>
                      )}
                    </div>
                    <div className={`p-2 rounded text-sm ${
                      questao.resposta_correta === 'F' ? 'bg-green-50 border border-green-200' : 'bg-muted/30'
                    }`}>
                      Falso
                      {questao.resposta_correta === 'F' && (
                        <span className="ml-2 text-green-600 font-medium">(Correta)</span>
                      )}
                    </div>
                  </div>
                )}

                {questao.tipo === 'dissertativa' && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Resposta esperada:</strong> {prova.conteudo.gabarito[questao.numero.toString()]}
                    </p>
                  </div>
                )}
              </div>
            ))}

            <Separator />
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Gabarito
              </h3>
              <div className="grid grid-cols-5 gap-2 text-sm">
                {Object.entries(prova.conteudo.gabarito).map(([numero, resposta]) => (
                  <div key={numero} className="flex justify-between">
                    <span>{numero}:</span>
                    <span className="font-medium">{resposta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};