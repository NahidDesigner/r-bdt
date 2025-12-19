import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product, ProductVariant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Edit, Trash2, ExternalLink, Loader2, ImagePlus, X } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth } from "@/lib/auth";

const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  price: z.string().min(1, "Price is required"),
  description: z.string().optional(),
  status: z.enum(["active", "draft", "archived"]),
  images: z.array(z.string()).optional(),
  hasVariants: z.boolean().optional(),
});

const variantFormSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  stock: z.number().min(0, "Stock must be 0 or greater"),
  attributes: z.string().optional(), // JSON string for size, color, etc.
  isDefault: z.boolean().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function ProductsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch variants when editing a product
  const { data: productVariants, isLoading: isLoadingVariants, refetch: refetchVariants } = useQuery<ProductVariant[]>({
    queryKey: ["/api/products", editingProduct?.id, "variants"],
    enabled: !!editingProduct?.id && isDialogOpen,
    queryFn: () => apiRequest("GET", `/api/products/${editingProduct?.id}/variants`),
  });

  // Refetch variants when dialog opens for editing
  useEffect(() => {
    if (isDialogOpen && editingProduct?.id) {
      refetchVariants();
    }
  }, [isDialogOpen, editingProduct?.id, refetchVariants]);

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      toast({ title: "Product created", description: "Your product has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) =>
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      toast({ title: "Product updated", description: "Your product has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted", description: "Your product has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)} data-testid="button-add-product">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              variants={productVariants || []}
              onSubmit={(data) => {
                if (editingProduct) {
                  updateMutation.mutate({ id: editingProduct.id, data });
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => handleEdit(product)}
              onDelete={() => handleDelete(product.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onAddProduct={() => setIsDialogOpen(true)} />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { user } = useAuth();
  const tenantSlug = user?.tenant?.slug;
  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <Card data-testid={`product-card-${product.id}`}>
      <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <Badge className={statusStyles[product.status]}>
            {product.status}
          </Badge>
        </div>
        <p className="text-lg font-bold text-primary">৳{product.price}</p>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onEdit} data-testid={`button-edit-${product.id}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} data-testid={`button-delete-${product.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <a href={tenantSlug ? `/store/${tenantSlug}/${product.slug}` : `#`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductForm({
  product,
  variants: initialVariants = [],
  isLoadingVariants = false,
  onSubmit,
  isLoading,
  onCancel,
}: {
  product: Product | null;
  variants?: any[];
  isLoadingVariants?: boolean;
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const [variants, setVariants] = useState<any[]>(initialVariants);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const { toast } = useToast();
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      price: product?.price || "",
      description: product?.description || "",
      status: product?.status || "draft",
      images: product?.images || [],
    },
  });

  const name = form.watch("name");

  const variantForm = useForm<z.infer<typeof variantFormSchema>>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      stock: 0,
      attributes: "{}",
      isDefault: false,
    },
  });

  // Sync variants when initialVariants change or product changes
  useEffect(() => {
    if (product?.id) {
      // Always sync with initialVariants when product exists
      setVariants(initialVariants || []);
    } else {
      setVariants([]);
    }
  }, [product?.id, initialVariants]);
  
  // Debug: Log when variants change
  useEffect(() => {
    if (product?.id) {
      console.log("ProductForm - Product ID:", product.id);
      console.log("ProductForm - Initial Variants:", initialVariants);
      console.log("ProductForm - Current Variants State:", variants);
    }
  }, [product?.id, initialVariants, variants]);

  const generateSlug = () => {
    if (name && !product) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      form.setValue("slug", slug);
    }
  };

  const handleAddVariant = async (variantData: z.infer<typeof variantFormSchema>) => {
    if (!product?.id) {
      toast({ title: "Error", description: "Please save the product first before adding variants", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...variantData,
          attributes: variantData.attributes || "{}",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create variant");
      }

      const newVariant = await res.json();
      variantForm.reset();
      setShowVariantForm(false);
      // Invalidate and refetch variants - the useEffect will update the state
      await queryClient.invalidateQueries({ queryKey: ["/api/products", product.id, "variants"] });
      await queryClient.refetchQueries({ queryKey: ["/api/products", product.id, "variants"] });
      
      // Update product to mark it as having variants
      if (!product.hasVariants) {
        await fetch(`/api/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hasVariants: true }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      }
      
      toast({ title: "Variant added", description: "Product variant has been added successfully." });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add variant", variant: "destructive" });
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!product?.id) return;
    if (!window.confirm("Are you sure you want to delete this variant?")) return;

    try {
      const res = await fetch(`/api/variants/${variantId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete variant");

      setVariants(variants.filter((v) => v.id !== variantId));
      queryClient.invalidateQueries({ queryKey: ["/api/products", product.id, "variants"] });
      toast({ title: "Variant deleted", description: "Variant has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete variant", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Premium T-Shirt"
                  data-testid="input-product-name"
                  {...field}
                  onBlur={generateSlug}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="premium-tshirt"
                  data-testid="input-product-slug"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (BDT)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="999"
                  data-testid="input-product-price"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your product..."
                  rows={4}
                  data-testid="input-product-description"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Images</FormLabel>
              <FormControl>
                <ImageUpload
                  images={field.value || []}
                  onChange={field.onChange}
                  maxImages={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-product-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Variant Management - Only show for existing products */}
        {product?.id && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Product Variants</h3>
                <p className="text-sm text-muted-foreground">Add size, color, or other options</p>
              </div>
              {!showVariantForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowVariantForm(true);
                    setEditingVariant(null);
                    variantForm.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              )}
            </div>

            {showVariantForm && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{editingVariant ? "Edit Variant" : "New Variant"}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowVariantForm(false);
                        setEditingVariant(null);
                        variantForm.reset();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Form {...variantForm}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={variantForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Variant Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Small - Red" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={variantForm.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="SKU-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={variantForm.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (BDT)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={variantForm.control}
                          name="stock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          className="flex-1"
                          onClick={async () => {
                            const isValid = await variantForm.trigger();
                            if (isValid) {
                              const data = variantForm.getValues();
                              await handleAddVariant(data);
                            }
                          }}
                        >
                          {editingVariant ? "Update" : "Add"} Variant
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowVariantForm(false);
                            setEditingVariant(null);
                            variantForm.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Form>
                </CardContent>
              </Card>
            )}

            {variants.length > 0 && (
              <div className="space-y-2">
                {variants.map((variant) => (
                  <Card key={variant.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{variant.name}</span>
                            {variant.isDefault && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>Price: ৳{variant.price}</span>
                            <span className="mx-2">•</span>
                            <span>Stock: {variant.stock}</span>
                            {variant.sku && (
                              <>
                                <span className="mx-2">•</span>
                                <span>SKU: {variant.sku}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariant(variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1" data-testid="button-save-product">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : product ? (
              "Update Product"
            ) : (
              "Create Product"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EmptyState({ onAddProduct }: { onAddProduct: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">No products yet</h3>
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          Add your first product to start selling. Each product gets its own landing page optimized for conversions.
        </p>
        <Button onClick={onAddProduct} data-testid="button-add-first-product">
          <Plus className="mr-2 h-4 w-4" />
          Add Your First Product
        </Button>
      </CardContent>
    </Card>
  );
}
