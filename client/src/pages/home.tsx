import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Store,
  ShoppingCart,
  Truck,
  BarChart3,
  Check,
  ArrowRight,
  Smartphone,
  Shield,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl">StoreBuilder BD</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login-home">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button data-testid="button-register-home">Start Free</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 md:py-32">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Launch Your Online Store
            <br />
            <span className="text-primary">in Minutes</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The easiest way for Bangladeshi traders to sell online. Create product pages,
            accept Cash on Delivery orders, and grow your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-get-started">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">See How It Works</a>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Cash on Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Mobile-first design</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Sell
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete solution designed specifically for Bangladeshi traders.
              No technical skills required.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Smartphone}
              title="Mobile-First Landing Pages"
              description="Beautiful product pages optimized for mobile. 80% of your customers browse on phones."
            />
            <FeatureCard
              icon={ShoppingCart}
              title="Simple Checkout"
              description="On-page checkout with name, phone, and address. No complicated cart system."
            />
            <FeatureCard
              icon={Truck}
              title="Shipping Calculator"
              description="Set different rates for Dhaka city and outside. Customers see costs upfront."
            />
            <FeatureCard
              icon={BarChart3}
              title="Facebook Pixel & GTM"
              description="Track conversions and retarget customers. Connect your ad accounts easily."
            />
            <FeatureCard
              icon={Shield}
              title="Cash on Delivery"
              description="The payment method Bangladeshi customers trust. No payment gateway needed."
            />
            <FeatureCard
              icon={Zap}
              title="Instant Store"
              description="Get your store URL immediately. Start selling the same day you sign up."
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              number="1"
              title="Create Your Store"
              description="Sign up with email and choose your store name. Get your own URL instantly."
            />
            <StepCard
              number="2"
              title="Add Products"
              description="Upload photos, set prices, and write descriptions. Each product gets a landing page."
            />
            <StepCard
              number="3"
              title="Start Selling"
              description="Share your product links on Facebook. Receive orders and manage deliveries."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground">
              Start free, upgrade as you grow.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            <PricingCard
              name="Starter"
              price="Free"
              features={[
                "Up to 3 products",
                "Subdomain (store.domain.com)",
                "Basic order management",
                "Email notifications",
              ]}
            />
            <PricingCard
              name="Pro"
              price="৳499"
              period="/month"
              featured
              features={[
                "Up to 10 products",
                "Facebook Pixel & GTM",
                "Priority support",
                "Advanced analytics",
              ]}
            />
            <PricingCard
              name="Business"
              price="৳999"
              period="/month"
              features={[
                "Unlimited products",
                "Custom domain",
                "All Pro features",
                "Dedicated support",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Selling?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Join thousands of Bangladeshi traders who are growing their business online.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2" data-testid="button-cta-bottom">
              Create Your Free Store
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <span>StoreBuilder BD</span>
          </div>
          <p>Built for Bangladeshi traders. Cash on Delivery ready.</p>
        </div>
      </footer>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  features,
  featured,
}: {
  name: string;
  price: string;
  period?: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <Card className={featured ? "border-primary shadow-lg relative" : ""}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Popular
          </span>
        </div>
      )}
      <CardContent className="pt-8 pb-6">
        <h3 className="font-display font-semibold text-lg mb-2">{name}</h3>
        <div className="mb-6">
          <span className="text-3xl font-bold">{price}</span>
          {period && <span className="text-muted-foreground">{period}</span>}
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link href="/register">
          <Button variant={featured ? "default" : "outline"} className="w-full">
            Get Started
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
