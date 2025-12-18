import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { DomainMapping } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2, Check, Clock, AlertCircle, Loader2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function DomainsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDomain, setNewDomain] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const canUseCustomDomains = user?.tenant?.plan?.allowCustomDomain;

  const { data: domains, isLoading } = useQuery<DomainMapping[]>({
    queryKey: ["/api/domains"],
  });

  const addMutation = useMutation({
    mutationFn: (domain: string) => apiRequest("POST", "/api/domains", { domain }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setNewDomain("");
      setDialogOpen(false);
      toast({ title: "Domain added", description: "Your domain has been added. Please set up your CNAME record." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/domains/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain removed", description: "The domain has been removed from your store." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/domains/${id}/verify`),
    onSuccess: () => {
      toast({ title: "Verification requested", description: "We'll verify your domain. This usually takes a few minutes." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Custom Domains</h1>
          <p className="text-muted-foreground mt-1">Connect your own domain to your store</p>
        </div>
        
        {canUseCustomDomains && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-domain">
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Domain</DialogTitle>
                <DialogDescription>
                  Enter the domain you want to connect to your store.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="shop.yourdomain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  data-testid="input-new-domain"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => addMutation.mutate(newDomain)}
                  disabled={!newDomain || addMutation.isPending}
                  data-testid="button-submit-domain"
                >
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Domain
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canUseCustomDomains && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upgrade Required</AlertTitle>
          <AlertDescription>
            Custom domains are not available on your current plan. Please upgrade to connect your own domain.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="font-display">Your Domains</CardTitle>
          </div>
          <CardDescription>
            Manage custom domains for your storefront
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!domains || domains.length === 0) ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No custom domains configured</p>
              {canUseCustomDomains && (
                <p className="text-sm text-muted-foreground mt-1">
                  Add a domain to give your store a professional look
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-md"
                  data-testid={`domain-item-${domain.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{domain.domain}</p>
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(domain.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.verified ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {!domain.verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyMutation.mutate(domain.id)}
                        disabled={verifyMutation.isPending}
                        data-testid={`button-verify-${domain.id}`}
                      >
                        Request Verification
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(domain.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${domain.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canUseCustomDomains && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">DNS Setup Instructions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To connect your domain, create a CNAME record pointing to your platform domain.
            </p>
            <div className="bg-muted p-4 rounded-md font-mono text-sm">
              <p>Type: CNAME</p>
              <p>Name: shop (or your subdomain)</p>
              <p>Value: your-platform-domain.com</p>
            </div>
            <p className="text-sm text-muted-foreground">
              DNS changes can take up to 48 hours to propagate. Once set up, request verification and our team will activate your domain.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
