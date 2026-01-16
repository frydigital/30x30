"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  Edit, 
  Plus,
  Check
} from "lucide-react";
import type { SubscriptionPlan } from "@/lib/types";

export default function SubscriptionsManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const supabase = createClient();
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;

      setPlans(data || []);
    } catch (err) {
      console.error("Error loading plans:", err);
      setError("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const togglePlanActive = async (planId: string, currentStatus: boolean) => {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: !currentStatus })
        .eq("id", planId);

      if (error) throw error;

      await loadPlans();
    } catch (err) {
      console.error("Error toggling plan status:", err);
      alert("Failed to update plan status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <p className="text-muted-foreground">
            Manage pricing plans and features
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {plan.description}
                  </CardDescription>
                </div>
                {!plan.is_active && (
                  <Badge variant="outline" className="text-red-600">
                    Inactive
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="space-y-2">
                {plan.price_monthly !== null ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-3xl font-bold">
                        {plan.price_monthly.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {plan.price_yearly !== null && (
                      <p className="text-sm text-muted-foreground">
                        or ${plan.price_yearly.toFixed(2)}/year
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-2xl font-bold">Custom Pricing</div>
                )}
              </div>

              {/* Member Limit */}
              <div className="text-sm">
                <span className="text-muted-foreground">Member Limit: </span>
                <span className="font-medium">
                  {plan.max_members === null ? "Unlimited" : plan.max_members}
                </span>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Features:</p>
                <ul className="space-y-1">
                  {(plan.features as string[]).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={plan.is_active ? "destructive" : "default"}
                  onClick={() => togglePlanActive(plan.id, plan.is_active)}
                >
                  {plan.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription Usage
          </CardTitle>
          <CardDescription>
            Organization distribution across plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${plan.is_active ? 'bg-primary' : 'bg-gray-400'}`} />
                  <span className="font-medium">{plan.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">0 organizations</span>
                  <span className="text-sm text-muted-foreground">
                    {plan.price_monthly ? `$${plan.price_monthly}/mo` : 'Custom'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
