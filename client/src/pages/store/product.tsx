import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, type CheckoutInput, type Product, type ShippingClass, type StoreSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  Truck,
  Shield,
  Phone,
  Check,
  Minus,
  Plus,
  Loader2,
  Store,
  ImageOff,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

interface StoreData {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  product: Product;
  shippingClasses: ShippingClass[];
  settings: StoreSettings | null;
}

export default function ProductPage() {
  const { storeSlug, productSlug } = useParams<{ storeSlug: string; productSlug: string }>();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { data, isLoading, error } = useQuery<StoreData>({
    queryKey: ["/api/store", storeSlug, "product", productSlug],
    queryFn: async () => {
      const res = await fetch(`/api/store/${storeSlug}/product/${productSlug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
  });

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      address: "",
      quantity: 1,
      shippingClassId: "",
    },
  });

  useEffect(() => {
    if (data?.shippingClasses?.length) {
      const defaultClass = data.shippingClasses.find((sc) => sc.isDefault) || data.shippingClasses[0];
      if (defaultClass) {
        form.setValue("shippingClassId", defaultClass.id);
      }
    }
  }, [data?.shippingClasses, form]);

  useEffect(() => {
    form.setValue("quantity", quantity);
  }, [quantity, form]);

  useEffect(() => {
    if (data?.settings?.fbPixelId) {
      trackFBEvent("PageView");
      trackFBEvent("ViewContent", {
        content_name: data.product.name,
        content_ids: [data.product.id],
        content_type: "product",
        value: parseFloat(data.product.price),
        currency: "BDT",
      });
    }
  }, [data]);

  const selectedShippingClass = data?.shippingClasses?.find(
    (sc) => sc.id === form.watch("shippingClassId")
  );

  const subtotal = data?.product ? parseFloat(data.product.price) * quantity : 0;
  const shippingFee = selectedShippingClass ? parseFloat(selectedShippingClass.fee) : 0;
  const total = subtotal + shippingFee;

  const orderMutation = useMutation({
    mutationFn: (orderData: CheckoutInput & { productId: string }) =>
      apiRequest("POST", `/api/store/${storeSlug}/orders`, orderData),
    onSuccess: () => {
      setOrderSuccess(true);
      if (data?.settings?.fbPixelId) {
        trackFBEvent("Purchase", {
          content_name: data.product.name,
          content_ids: [data.product.id],
          content_type: "product",
          value: total,
          currency: "BDT",
        });
      }
      toast({ title: "Order placed!", description: "We'll contact you shortly to confirm." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (formData: CheckoutInput) => {
    if (!data?.product) return;

    if (data?.settings?.fbPixelId) {
      trackFBEvent("InitiateCheckout", {
        content_name: data.product.name,
        content_ids: [data.product.id],
        content_type: "product",
        value: total,
        currency: "BDT",
      });
    }

    orderMutation.mutate({
      ...formData,
      productId: data.product.id,
    });
  };

  if (isLoading) {
    return <ProductSkeleton />;
  }

  if (error || !data) {
    return <ProductNotFound />;
  }

  if (orderSuccess) {
    return <OrderConfirmation storeName={data.tenant.name} />;
  }

  const { tenant, product, shippingClasses, settings } = data;

  return (
    <div className="min-h-screen bg-background">
      <TrackingScripts settings={settings} />

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-display font-bold">{tenant.name}</span>
          </div>
          {settings?.whatsappNumber && (
            <a
              href={`https://wa.me/${settings.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
              data-testid="link-whatsapp"
            >
              <SiWhatsapp className="h-4 w-4" />
              <span className="hidden sm:inline">Contact</span>
            </a>
          )}
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  data-testid="img-product"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-blue-500" />
                <span>Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-purple-500" />
                <span>Cash on Delivery</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">In Stock</Badge>
              <h1 className="font-display text-3xl md:text-4xl font-bold" data-testid="text-product-name">
                {product.name}
              </h1>
              <p className="text-3xl font-bold text-primary mt-3" data-testid="text-product-price">
                ৳{product.price}
              </p>
            </div>

            {product.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>{product.description}</p>
              </div>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Now
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          data-testid="button-decrease-qty"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-bold text-lg" data-testid="text-quantity">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(quantity + 1)}
                          data-testid="button-increase-qty"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              data-testid="input-customer-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">
                                +880
                              </span>
                              <Input
                                placeholder="1XXXXXXXXX"
                                className="rounded-l-none"
                                data-testid="input-phone"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your complete delivery address with landmarks..."
                              rows={3}
                              data-testid="input-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {shippingClasses.length > 0 && (
                      <FormField
                        control={form.control}
                        name="shippingClassId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shipping Zone</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-2"
                              >
                                {shippingClasses.map((sc) => (
                                  <div
                                    key={sc.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                                    onClick={() => field.onChange(sc.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <RadioGroupItem value={sc.id} id={sc.id} data-testid={`radio-shipping-${sc.id}`} />
                                      <Label htmlFor={sc.id} className="cursor-pointer">
                                        <span className="font-medium">{sc.name}</span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                          ({sc.location})
                                        </span>
                                      </Label>
                                    </div>
                                    <span className="font-medium">৳{sc.fee}</span>
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Subtotal ({quantity} item{quantity > 1 ? "s" : ""})
                        </span>
                        <span>৳{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>৳{shippingFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary" data-testid="text-total">৳{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={orderMutation.isPending}
                      data-testid="button-place-order"
                    >
                      {orderMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Confirm Order (Cash on Delivery)
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Pay when you receive your order. No advance payment required.
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {settings?.whatsappNumber && (
        <a
          href={`https://wa.me/${settings.whatsappNumber}?text=Hi, I'm interested in ${product.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors"
          data-testid="button-whatsapp-float"
        >
          <SiWhatsapp className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}

function TrackingScripts({ settings }: { settings: StoreSettings | null }) {
  useEffect(() => {
    if (settings?.fbPixelId) {
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${settings.fbPixelId}');
      `;
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [settings?.fbPixelId]);

  useEffect(() => {
    if (settings?.gtmId) {
      const script = document.createElement("script");
      script.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${settings.gtmId}');
      `;
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [settings?.gtmId]);

  return null;
}

function trackFBEvent(event: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, params);
  }
}

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <ImageOff className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Product Not Found</h1>
        <p className="text-muted-foreground">
          The product you're looking for doesn't exist or has been removed.
        </p>
      </div>
    </div>
  );
}

function OrderConfirmation({ storeName }: { storeName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 w-fit mx-auto mb-6">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2" data-testid="text-order-success">
            Order Placed Successfully!
          </h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your order. {storeName} will contact you shortly to confirm your order and delivery details.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>You'll receive a call to confirm</span>
            </p>
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>Pay when you receive your order</span>
            </p>
            <p className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>100% secure transaction</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
