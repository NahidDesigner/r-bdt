import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Plan } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard, Edit, Trash2, Loader2, Package, BarChart3, Globe } from "lucide-react";

const planFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  productLimit: z.string().min(1, "Product limit is required"),
  price: z.string().min(1, "Price is required"),
  allowCustomDomain: z.boolean(),
  allowTracking: z.boolean(),
  isActive: z.boolean(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function PlansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
  });

  const createMutation = useMutation({
    mutationFn: (data: PlanFormData) =>
      apiRequest("POST", "/api/admin/plans", {
        ...data,
        productLimit: parseInt(data.productLimit),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setIsDialogOpen(false);
      toast({ title: "Plan created", description: "The plan has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormData }) =>
      apiRequest("PATCH", `/api/admin/plans/${id}`, {
        ...data,
        productLimit: parseInt(data.productLimit),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      toast({ title: "Plan updated", description: "The plan has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({ title: "Plan deleted", description: "The plan has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      deleteMutation.mutate(id);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Plans</h1>
          <p className="text-muted-foreground mt-1">Manage subscription plans and pricing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)} data-testid="button-add-plan">
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingPlan ? "Edit Plan" : "Add New Plan"}
              </DialogTitle>
            </DialogHeader>
            <PlanForm
              plan={editingPlan}
              onSubmit={(data) => {
                if (editingPlan) {
                  updateMutation.mutate({ id: editingPlan.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
              onCancel={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => handleEdit(plan)}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onAdd={() => setIsDialogOpen(true)} />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card data-testid={`plan-card-${plan.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-display">{plan.name}</CardTitle>
            <CardDescription className="mt-1">
              <span className="text-2xl font-bold text-foreground">৳{plan.price}</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </div>
          {!plan.isActive && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{plan.productLimit} products</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span>
              {plan.allowTracking ? "Tracking enabled" : "No tracking"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>
              {plan.allowCustomDomain ? "Custom domain" : "Subdomain only"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1" data-testid={`button-edit-${plan.id}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} data-testid={`button-delete-${plan.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanForm({
  plan,
  onSubmit,
  isLoading,
  onCancel,
}: {
  plan: Plan | null;
  onSubmit: (data: PlanFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: plan?.name || "",
      productLimit: plan?.productLimit?.toString() || "5",
      price: plan?.price || "0",
      allowCustomDomain: plan?.allowCustomDomain || false,
      allowTracking: plan?.allowTracking ?? true,
      isActive: plan?.isActive ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Pro"
                  data-testid="input-plan-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Price (BDT)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="499"
                  data-testid="input-plan-price"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="productLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Limit</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="10"
                  data-testid="input-plan-product-limit"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowTracking"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel className="text-base">Allow Tracking</FormLabel>
                <FormDescription>Facebook Pixel & GTM</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-allow-tracking"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowCustomDomain"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel className="text-base">Custom Domain</FormLabel>
                <FormDescription>Allow custom domains</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-allow-custom-domain"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>Make available for selection</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-is-active"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1" data-testid="button-save-plan">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : plan ? (
              "Update Plan"
            ) : (
              "Create Plan"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">No plans yet</h3>
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          Create subscription plans to control features and limits for your tenants.
        </p>
        <Button onClick={onAdd} data-testid="button-add-first-plan">
          <Plus className="mr-2 h-4 w-4" />
          Create First Plan
        </Button>
      </CardContent>
    </Card>
  );
}
