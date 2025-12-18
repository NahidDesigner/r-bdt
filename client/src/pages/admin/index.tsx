import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Store, ShoppingCart, TrendingUp } from "lucide-react";

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalOrders: number;
  totalRevenue: string;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const statCards = [
    {
      title: "Total Tenants",
      value: stats?.totalTenants || 0,
      icon: Users,
      description: "Registered traders",
    },
    {
      title: "Active Stores",
      value: stats?.activeTenants || 0,
      icon: Store,
      description: "Currently active",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      description: "Across all stores",
    },
    {
      title: "Platform Revenue",
      value: `৳${stats?.totalRevenue || "0"}`,
      icon: TrendingUp,
      description: "Total GMV",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
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
                  <div className="text-2xl font-bold" data-testid={`admin-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
            <CardTitle className="font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <QuickActionCard
                href="/admin/tenants"
                icon={Users}
                title="Manage Tenants"
                description="View and manage all traders"
              />
              <QuickActionCard
                href="/admin/plans"
                icon={Store}
                title="Manage Plans"
                description="Configure subscription plans"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecentActivity() {
  const { data: activities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/recent-activity"],
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

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 5).map((activity: any, index: number) => (
        <div
          key={index}
          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
        >
          <div className="flex-1">
            <p className="font-medium">{activity.message}</p>
            <p className="text-sm text-muted-foreground">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
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
