import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ShippingClass } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Edit, Trash2, Loader2 } from "lucide-react";

const shippingFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
  fee: z.string().min(1, "Fee is required"),
  isDefault: z.boolean(),
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;

export default function ShippingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ShippingClass | null>(null);
  const { toast } = useToast();

  const { data: shippingClasses, isLoading } = useQuery<ShippingClass[]>({
    queryKey: ["/api/shipping-classes"],
  });

  const createMutation = useMutation({
    mutationFn: (data: ShippingFormData) => apiRequest("POST", "/api/shipping-classes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-classes"] });
      setIsDialogOpen(false);
      toast({ title: "Shipping class created", description: "Your shipping option has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShippingFormData }) =>
      apiRequest("PATCH", `/api/shipping-classes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-classes"] });
      setIsDialogOpen(false);
      setEditingClass(null);
      toast({ title: "Shipping class updated", description: "Your shipping option has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shipping-classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-classes"] });
      toast({ title: "Shipping class deleted", description: "Your shipping option has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (shippingClass: ShippingClass) => {
    setEditingClass(shippingClass);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this shipping option?")) {
      deleteMutation.mutate(id);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClass(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Shipping</h1>
          <p className="text-muted-foreground mt-1">Configure shipping rates for different locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClass(null)} data-testid="button-add-shipping">
              <Plus className="mr-2 h-4 w-4" />
              Add Shipping Option
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingClass ? "Edit Shipping Option" : "Add Shipping Option"}
              </DialogTitle>
            </DialogHeader>
            <ShippingForm
              shippingClass={editingClass}
              onSubmit={(data) => {
                if (editingClass) {
                  updateMutation.mutate({ id: editingClass.id, data });
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

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Default Zones</CardTitle>
          <CardDescription>
            Common shipping zones for Bangladesh. You can customize fees or add new zones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : shippingClasses && shippingClasses.length > 0 ? (
            <div className="space-y-3">
              {shippingClasses.map((sc) => (
                <ShippingClassCard
                  key={sc.id}
                  shippingClass={sc}
                  onEdit={() => handleEdit(sc)}
                  onDelete={() => handleDelete(sc.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState onAdd={() => setIsDialogOpen(true)} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Tips for Shipping</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Inside Dhaka:</strong> Typically ৳60-80 for standard delivery, ৳100-120 for same-day.
          </p>
          <p>
            <strong>Outside Dhaka:</strong> Usually ৳100-150 depending on the courier service.
          </p>
          <p>
            <strong>Remote Areas:</strong> Consider adding ৳20-50 extra for hard-to-reach locations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ShippingClassCard({
  shippingClass,
  onEdit,
  onDelete,
}: {
  shippingClass: ShippingClass;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-lg border"
      data-testid={`shipping-card-${shippingClass.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Truck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{shippingClass.name}</h4>
            {shippingClass.isDefault && (
              <Badge size="sm" variant="secondary">Default</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{shippingClass.location}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-lg font-bold">৳{shippingClass.fee}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-${shippingClass.id}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-${shippingClass.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShippingForm({
  shippingClass,
  onSubmit,
  isLoading,
  onCancel,
}: {
  shippingClass: ShippingClass | null;
  onSubmit: (data: ShippingFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      name: shippingClass?.name || "",
      location: shippingClass?.location || "",
      fee: shippingClass?.fee || "",
      isDefault: shippingClass?.isDefault || false,
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Inside Dhaka"
                  data-testid="input-shipping-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location / Zone</FormLabel>
              <FormControl>
                <Input
                  placeholder="Dhaka City"
                  data-testid="input-shipping-location"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shipping Fee (BDT)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="60"
                  data-testid="input-shipping-fee"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel className="text-base">Set as Default</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Pre-select this option in checkout
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-shipping-default"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1" data-testid="button-save-shipping">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : shippingClass ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="rounded-full bg-primary/10 p-4 mx-auto w-fit mb-4">
        <Truck className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-2">No shipping options yet</h3>
      <p className="text-muted-foreground mb-4">
        Add shipping options so customers can see delivery costs.
      </p>
      <Button onClick={onAdd} data-testid="button-add-first-shipping">
        <Plus className="mr-2 h-4 w-4" />
        Add First Shipping Option
      </Button>
    </div>
  );
}
