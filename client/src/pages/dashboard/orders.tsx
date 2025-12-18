import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, MapPin, Phone, User, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order updated", description: "Order status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredOrders = orders?.filter((order) =>
    statusFilter === "all" ? true : order.status === statusFilter
  );

  const orderCounts = {
    all: orders?.length || 0,
    new: orders?.filter((o) => o.status === "new").length || 0,
    confirmed: orders?.filter((o) => o.status === "confirmed").length || 0,
    shipped: orders?.filter((o) => o.status === "shipped").length || 0,
    delivered: orders?.filter((o) => o.status === "delivered").length || 0,
    cancelled: orders?.filter((o) => o.status === "cancelled").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage customer orders and track deliveries</p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({orderCounts.all})
          </TabsTrigger>
          <TabsTrigger value="new" data-testid="tab-new">
            New ({orderCounts.new})
          </TabsTrigger>
          <TabsTrigger value="confirmed" data-testid="tab-confirmed">
            Confirmed ({orderCounts.confirmed})
          </TabsTrigger>
          <TabsTrigger value="shipped" data-testid="tab-shipped">
            Shipped ({orderCounts.shipped})
          </TabsTrigger>
          <TabsTrigger value="delivered" data-testid="tab-delivered">
            Delivered ({orderCounts.delivered})
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">
            Cancelled ({orderCounts.cancelled})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={() => setSelectedOrder(order)}
                  onUpdateStatus={(status) =>
                    updateStatusMutation.mutate({ id: order.id, status })
                  }
                  isUpdating={updateStatusMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState status={statusFilter} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => {
                updateStatusMutation.mutate({ id: selectedOrder.id, status });
                setSelectedOrder(null);
              }}
              isUpdating={updateStatusMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({
  order,
  onViewDetails,
  onUpdateStatus,
  isUpdating,
}: {
  order: Order;
  onViewDetails: () => void;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
}) {
  const statusStyles: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    confirmed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Card data-testid={`order-card-${order.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">
                #{order.id.slice(0, 8)}
              </span>
              <Badge size="sm" className={statusStyles[order.status]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>Qty: {order.quantity}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold">৳{order.total}</p>
              <p className="text-xs text-muted-foreground">COD</p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={order.status}
                onValueChange={onUpdateStatus}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-32" data-testid={`select-status-${order.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={onViewDetails} data-testid={`button-view-${order.id}`}>
                View
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderDetails({
  order,
  onUpdateStatus,
  isUpdating,
}: {
  order: Order;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Customer Name</p>
            <p className="font-medium">{order.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Phone Number</p>
            <p className="font-medium">{order.phone}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Delivery Address</p>
            <p className="font-medium">{order.address}</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Order Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantity</span>
            <span>{order.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>৳{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>৳{order.shippingFee}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span>৳{order.total}</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="text-sm font-medium mb-2 block">Update Status</label>
        <Select value={order.status} onValueChange={onUpdateStatus} disabled={isUpdating}>
          <SelectTrigger data-testid="select-order-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function EmptyState({ status }: { status: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <ShoppingCart className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">
          No {status === "all" ? "" : status} orders
        </h3>
        <p className="text-muted-foreground text-center max-w-sm">
          {status === "all"
            ? "Orders will appear here once customers start placing them."
            : `You don't have any ${status} orders at the moment.`}
        </p>
      </CardContent>
    </Card>
  );
}
