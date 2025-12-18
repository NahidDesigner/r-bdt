import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Product, StoreSettings } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Store, ShoppingBag, ImageOff } from "lucide-react";

interface StoreHomeData {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  products: Product[];
  settings: StoreSettings | null;
}

export default function StoreHomePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();

  const { data, isLoading, error } = useQuery<StoreHomeData>({
    queryKey: ["/api/store", storeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/store/${storeSlug}`);
      if (!res.ok) throw new Error("Store not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Store Not Found</h1>
          <p className="text-muted-foreground">
            The store you're looking for doesn't exist or is no longer available.
          </p>
        </Card>
      </div>
    );
  }

  const { tenant, products, settings } = data;
  const primaryColor = settings?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          {settings?.storeLogo ? (
            <img
              src={settings.storeLogo}
              alt={tenant.name}
              className="h-10 w-10 rounded-md object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-md flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="font-display font-bold text-xl">{tenant.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Products Yet</h2>
            <p className="text-muted-foreground">
              This store hasn't added any products yet. Check back later!
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold">Our Products</h2>
              <p className="text-muted-foreground">{products.length} products available</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/store/${tenant.slug}/${product.slug}`}
                  className="block group"
                  data-testid={`link-product-${product.id}`}
                >
                  <Card className="overflow-hidden h-full hover-elevate">
                    <div className="aspect-square bg-muted relative">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-2">{product.name}</h3>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className="text-lg font-bold"
                          style={{ color: primaryColor }}
                        >
                          ৳{parseFloat(product.price).toLocaleString()}
                        </span>
                        <Badge variant="secondary">COD</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by StoreBuilder BD</p>
        </div>
      </footer>
    </div>
  );
}
