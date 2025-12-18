import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tenant, Plan } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, MoreVertical, ExternalLink, Ban, CheckCircle, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface TenantWithPlan extends Tenant {
  plan?: Plan;
  _count?: {
    products: number;
    orders: number;
  };
  userEmail?: string;
  contactEmail?: string;
  phone?: string;
}

export default function TenantsPage() {
  const [selectedTenant, setSelectedTenant] = useState<TenantWithPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: tenants, isLoading } = useQuery<TenantWithPlan[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/tenants/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant updated", description: "Status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) =>
      apiRequest("PATCH", `/api/admin/tenants/${id}/plan`, { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Plan updated", description: "Tenant plan has been changed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant deleted", description: "The tenant has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredTenants = tenants?.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Tenants</h1>
        <p className="text-muted-foreground mt-1">Manage all registered traders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-tenants"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filteredTenants && filteredTenants.length > 0 ? (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              plans={plans || []}
              onViewDetails={() => setSelectedTenant(tenant)}
              onUpdateStatus={(status) =>
                updateStatusMutation.mutate({ id: tenant.id, status })
              }
              onUpdatePlan={(planId) =>
                updatePlanMutation.mutate({ id: tenant.id, planId })
              }
              onDelete={() => {
                if (confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone.`)) {
                  deleteMutation.mutate(tenant.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <TenantDetails
              tenant={selectedTenant}
              plans={plans || []}
              onUpdateStatus={(status) => {
                updateStatusMutation.mutate({ id: selectedTenant.id, status });
              }}
              onUpdatePlan={(planId) => {
                updatePlanMutation.mutate({ id: selectedTenant.id, planId });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TenantCard({
  tenant,
  plans,
  onViewDetails,
  onUpdateStatus,
  onUpdatePlan,
  onDelete,
}: {
  tenant: TenantWithPlan;
  plans: Plan[];
  onViewDetails: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdatePlan: (planId: string) => void;
  onDelete: () => void;
}) {
  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  return (
    <Card data-testid={`tenant-card-${tenant.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h3 className="font-semibold">{tenant.name}</h3>
              <Badge className={statusStyles[tenant.status]}>
                {tenant.status}
              </Badge>
              {tenant.plan && (
                <Badge variant="outline">
                  {tenant.plan.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{tenant._count?.products || 0} products</span>
              <span>{tenant._count?.orders || 0} orders</span>
              <span>Since {format(new Date(tenant.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={tenant.planId || ""}
              onValueChange={onUpdatePlan}
            >
              <SelectTrigger className="w-32" data-testid={`select-plan-${tenant.id}`}>
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-actions-${tenant.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/store/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Store
                  </a>
                </DropdownMenuItem>
                {tenant.status === "active" ? (
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus("suspended")}
                    className="text-red-600"
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Suspend
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus("active")}
                    className="text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantDetails({
  tenant,
  plans,
  onUpdateStatus,
  onUpdatePlan,
}: {
  tenant: TenantWithPlan;
  plans: Plan[];
  onUpdateStatus: (status: string) => void;
  onUpdatePlan: (planId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Store Name</p>
          <p className="font-medium">{tenant.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Store Slug</p>
          <p className="font-medium font-mono">{tenant.slug}</p>
        </div>
        {tenant.userEmail && (
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{tenant.userEmail}</p>
          </div>
        )}
        {tenant.contactEmail && (
          <div>
            <p className="text-sm text-muted-foreground">Contact Email</p>
            <p className="font-medium">{tenant.contactEmail}</p>
          </div>
        )}
        {tenant.phone && (
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{tenant.phone}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">Created At</p>
          <p className="font-medium">{format(new Date(tenant.createdAt), "PPpp")}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Statistics</p>
          <p className="font-medium">
            {tenant._count?.products || 0} products, {tenant._count?.orders || 0} orders
          </p>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Plan</label>
          <Select value={tenant.planId || ""} onValueChange={onUpdatePlan}>
            <SelectTrigger data-testid="select-tenant-plan">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} - {plan.productLimit} products
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select value={tenant.status} onValueChange={onUpdateStatus}>
            <SelectTrigger data-testid="select-tenant-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">No tenants found</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Tenants will appear here once traders sign up for the platform.
        </p>
      </CardContent>
    </Card>
  );
}
