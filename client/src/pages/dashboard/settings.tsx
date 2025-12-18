import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import type { StoreSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, BarChart3, Palette, Phone, Loader2, Check } from "lucide-react";
import { SiFacebook, SiGoogletagmanager } from "react-icons/si";

const settingsFormSchema = z.object({
  fbPixelId: z.string().optional(),
  gtmId: z.string().optional(),
  primaryColor: z.string().optional(),
  whatsappNumber: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: SettingsFormData) => apiRequest("PATCH", "/api/store-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      refetch();
      toast({ title: "Settings saved", description: "Your store settings have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      fbPixelId: settings?.fbPixelId || "",
      gtmId: settings?.gtmId || "",
      primaryColor: settings?.primaryColor || "#3b82f6",
      whatsappNumber: settings?.whatsappNumber || "",
      contactEmail: settings?.contactEmail || "",
    },
    values: {
      fbPixelId: settings?.fbPixelId || "",
      gtmId: settings?.gtmId || "",
      primaryColor: settings?.primaryColor || "#3b82f6",
      whatsappNumber: settings?.whatsappNumber || "",
      contactEmail: settings?.contactEmail || "",
    },
  });

  const canUseTracking = user?.tenant?.plan?.allowTracking !== false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your store settings and tracking</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Tracking & Analytics</CardTitle>
              </div>
              <CardDescription>
                Connect Facebook Pixel and Google Tag Manager to track conversions and sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canUseTracking && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Tracking features are not available on your current plan. Please upgrade to enable Facebook Pixel and GTM.
                  </p>
                </div>
              )}
              <FormField
                control={form.control}
                name="fbPixelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <SiFacebook className="h-4 w-4" />
                      Facebook Pixel ID
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234567890123456"
                        disabled={!canUseTracking}
                        data-testid="input-fb-pixel"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Find this in your Facebook Events Manager under Data Sources.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gtmId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <SiGoogletagmanager className="h-4 w-4" />
                      Google Tag Manager ID
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="GTM-XXXXXXX"
                        disabled={!canUseTracking}
                        data-testid="input-gtm-id"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Find this in your GTM dashboard workspace.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {canUseTracking && (settings?.fbPixelId || settings?.gtmId) && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span>Tracking is active on your storefront</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Contact Information</CardTitle>
              </div>
              <CardDescription>
                Add contact details for your customers to reach you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="8801XXXXXXXXX"
                        data-testid="input-whatsapp"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include country code without + sign. A WhatsApp button will appear on your store.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="support@yourstore.com"
                        data-testid="input-contact-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Store Branding</CardTitle>
              </div>
              <CardDescription>
                Customize the look and feel of your store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          className="w-16 h-10 p-1 cursor-pointer"
                          data-testid="input-primary-color"
                          {...field}
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      This color will be used for buttons and accents on your store.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="font-display">Store Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Store Name</p>
              <p className="font-medium">{user?.tenant?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Store URL</p>
              <p className="font-medium font-mono">{user?.tenant?.slug}.yourdomain.com</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <div className="flex items-center gap-2">
                <Badge>{user?.tenant?.plan?.name || "Free"}</Badge>
                {user?.tenant?.plan?.productLimit && (
                  <span className="text-sm text-muted-foreground">
                    ({user.tenant.plan.productLimit} products)
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {user?.tenant?.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
