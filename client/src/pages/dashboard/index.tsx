import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ShoppingCart, TrendingUp, DollarSign } from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  newOrders: number;
  totalRevenue: string;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const statCards = [
    {
      title: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      description: "Active products in your store",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      description: "All time orders received",
    },
    {
      title: "New Orders",
      value: stats?.newOrders || 0,
      icon: TrendingUp,
      description: "Pending confirmation",
    },
    {
      title: "Total Revenue",
      value: `৳${stats?.totalRevenue || "0"}`,
      icon: DollarSign,
      description: "From delivered orders",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">
          Welcome back, {user?.tenant?.name || "Trader"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your store today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <RecentOrders />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <QuickActionCard
                href="/dashboard/products?action=new"
                icon={Package}
                title="Add New Product"
                description="List a new product for sale"
              />
              <QuickActionCard
                href="/dashboard/orders?status=new"
                icon={ShoppingCart}
                title="Process Orders"
                description="View and confirm pending orders"
              />
              <QuickActionCard
                href="/dashboard/settings"
                icon={TrendingUp}
                title="Setup Tracking"
                description="Configure Facebook Pixel & GTM"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecentOrders() {
  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders", { limit: 5 }],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No orders yet</p>
        <p className="text-sm">Orders will appear here once customers start buying</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.slice(0, 5).map((order: any) => (
        <div
          key={order.id}
          className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
          data-testid={`order-item-${order.id}`}
        >
          <div className="min-w-0">
            <p className="font-medium truncate">{order.customerName}</p>
            <p className="text-sm text-muted-foreground">{order.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">৳{order.total}</p>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    confirmed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[status] || statusStyles.new}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-4 p-3 rounded-lg hover-elevate active-elevate-2 cursor-pointer border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
