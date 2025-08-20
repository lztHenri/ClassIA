import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProvaContent {
  questoes: Array<{
    numero: number;
    enunciado: string;
    alternativas?: string[];
    tipo?: string;
  }>;
  gabarito: Record<string, string>;
}

export const ChatInterface = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const formatProvaResponse = (conteudo: ProvaContent) => {
    let formatted = "";
    
    conteudo.questoes.forEach((questao) => {
      formatted += `**${questao.numero}. ${questao.enunciado}**\n\n`;
      
      if (questao.alternativas) {
        questao.alternativas.forEach((alt, index) => {
          const letra = String.fromCharCode(65 + index);
          formatted += `${letra}) ${alt.replace(/^[A-D]\)\s*/, '')}\n`;
        });
      }
      
      if (questao.tipo === 'verdadeiro_falso') {
        formatted += `( ) Verdadeiro\n( ) Falso\n`;
      }
      
      formatted += '\n---\n\n';
    });

    formatted += '**GABARITO:**\n\n';
    Object.entries(conteudo.gabarito).forEach(([numero, resposta]) => {
      formatted += `${numero}: ${resposta}\n`;
    });

    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-prova', {
        body: {
          prompt: userMessage.content
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      let responseContent = "";
      if (data.prova && data.prova.conteudo) {
        responseContent = formatProvaResponse(data.prova.conteudo);
      } else {
        responseContent = data.response || "Prova gerada com sucesso!";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.provas_restantes !== null && data.provas_restantes <= 2) {
        toast({
          title: "Atenção!",
          description: `Você tem ${data.provas_restantes} provas restantes no seu plano`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error generating prova:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Desculpe, ocorreu um erro ao gerar a prova: ${error.message}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro ao gerar prova",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <Card className={`p-4 ${
            isUser 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-muted/50 border-none'
          }`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </Card>
          <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="mb-6 text-center space-y-2">
        <h2 className="text-2xl font-montserrat font-bold">Digite aqui o tipo de prova que você deseja</h2>
        <p className="text-muted-foreground">
          Exemplo: "Crie uma prova de ciências com 10 questões de múltipla escolha sobre ecossistemas"
        </p>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 mb-4">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Bot className="w-12 h-12 mx-auto opacity-50" />
                <p>Comece uma conversa para gerar sua primeira prova!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex gap-3 justify-start mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <Card className="p-4 bg-muted/50 border-none">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando prova...
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua solicitação..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};