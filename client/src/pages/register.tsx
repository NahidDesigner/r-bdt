import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Store, Loader2, Check, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      storeName: "",
      storeSlug: "",
    },
  });

  const storeName = form.watch("storeName");
  const storeSlug = form.watch("storeSlug");

  useEffect(() => {
    if (storeName && !form.getValues("storeSlug")) {
      const slug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      form.setValue("storeSlug", slug);
    }
  }, [storeName, form]);

  useEffect(() => {
    if (!storeSlug || storeSlug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const res = await fetch(`/api/tenants/check-slug?slug=${encodeURIComponent(storeSlug)}`);
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [storeSlug]);

  const onSubmit = async (data: RegisterInput) => {
    if (!slugAvailable) {
      toast({
        title: "Slug not available",
        description: "Please choose a different store URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await register(data.email, data.password, data.storeName, data.storeSlug);
      toast({ title: "Welcome!", description: "Your store has been created successfully." });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <span className="font-display font-bold text-lg">StoreBuilder BD</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Create Your Store</CardTitle>
            <CardDescription>Start selling in minutes with Cash on Delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 8 characters"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="My Awesome Store"
                          data-testid="input-store-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="my-awesome-store"
                            data-testid="input-store-slug"
                            {...field}
                          />
                          {storeSlug && storeSlug.length >= 2 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {checkingSlug ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : slugAvailable ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : slugAvailable === false ? (
                                <X className="h-4 w-4 text-red-500" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your store will be at: {storeSlug || "your-store"}.yourdomain.com
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || slugAvailable === false}
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating store...
                    </>
                  ) : (
                    "Create Store"
                  )}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
