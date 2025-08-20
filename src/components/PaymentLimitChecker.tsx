import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PaymentLimitCheckerProps {
  onUpgrade?: () => void;
}

export const PaymentLimitChecker = ({ onUpgrade }: PaymentLimitCheckerProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLimitInfo = () => {
    if (!profile) return { limit: 5, used: 0, plan: 'free' };

    const { subscription_status, subscription_plan, subscription_end_date, provas_utilizadas } = profile;
    
    // Check if subscription is active and not expired
    if (subscription_status === 'active' && subscription_end_date) {
      const endDate = new Date(subscription_end_date);
      const now = new Date();
      
      if (endDate > now) {
        if (subscription_plan === 'pro') {
          return { limit: 100, used: provas_utilizadas, plan: 'pro' };
        } else if (subscription_plan === 'institutional') {
          return { limit: null, used: provas_utilizadas, plan: 'institutional' }; // unlimited
        }
      }
    }
    
    // Default to free plan
    return { limit: 5, used: provas_utilizadas, plan: 'free' };
  };

  const canGenerateProva = () => {
    const { limit, used } = getLimitInfo();
    return limit === null || used < limit; // unlimited or under limit
  };

  const getLimitDisplay = () => {
    const { limit, used, plan } = getLimitInfo();
    
    if (limit === null) {
      return `${used} provas geradas (Ilimitado)`;
    }
    
    return `${used}/${limit} provas utilizadas`;
  };

  const getAlertType = () => {
    const { limit, used } = getLimitInfo();
    
    if (limit === null) return null; // unlimited
    
    const percentUsed = used / limit;
    
    if (used >= limit) return 'blocked';
    if (percentUsed >= 0.8) return 'warning';
    if (percentUsed >= 0.6) return 'info';
    
    return null;
  };

  if (loading) return null;

  const alertType = getAlertType();
  const { limit, used, plan } = getLimitInfo();

  if (!alertType) return null;

  return (
    <div className="mb-4">
      {alertType === 'blocked' && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">Limite de provas atingido!</p>
              <p className="text-sm">Você utilizou todas as {limit} provas do seu plano gratuito.</p>
            </div>
            <Button size="sm" onClick={onUpgrade} className="ml-4">
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {alertType === 'warning' && (
        <Alert className="border-orange-500">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">Poucas provas restantes</p>
              <p className="text-sm">{getLimitDisplay()} - Considere fazer upgrade</p>
            </div>
            <Button size="sm" variant="outline" onClick={onUpgrade} className="ml-4">
              <Crown className="h-4 w-4 mr-2" />
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {alertType === 'info' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="text-sm">{getLimitDisplay()}</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};


export const usePaymentLimits = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const canGenerateProva = () => {
    if (!profile) return false;

    const { subscription_status, subscription_plan, subscription_end_date, provas_utilizadas } = profile;
    
    // Check if subscription is active and not expired
    if (subscription_status === 'active' && subscription_end_date) {
      const endDate = new Date(subscription_end_date);
      const now = new Date();
      
      if (endDate > now) {
        if (subscription_plan === 'institutional') {
          return true; // unlimited
        } else if (subscription_plan === 'pro') {
          return provas_utilizadas < 100;
        }
      }
    }
    
    // Free plan limit
    return provas_utilizadas < 5;
  };

  return {
    canGenerateProva: canGenerateProva(),
    profile,
    refreshProfile: loadProfile
  };
};