"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, ExternalLink } from "lucide-react";

interface Product {
  id: number;
  title: string;
  type: string;
  price: string;
  image: string;
  images: string[];
}

interface ProductSuggestionsProps {
  campaignName: string;
  audience: string;
  contentTypes?: string[];
}

// Match campaign to product types
function getRelevantTypes(campaignName: string, audience: string): string[] {
  const name = campaignName.toLowerCase();
  const aud = audience.toLowerCase();

  if (name.includes("suit") || name.includes("formal")) return ["Suits", "Blazer"];
  if (name.includes("linen") || name.includes("summer")) return ["Shirts", "T-shirt", "Sets"];
  if (name.includes("women") || aud.includes("women")) return ["Womens Shirts", "Dresses", "Sets"];
  if (name.includes("street") || name.includes("casual")) return ["T-shirt", "Sets"];
  if (name.includes("co-ord") || name.includes("set")) return ["Sets"];
  if (name.includes("eid") || name.includes("ramadan")) return ["Suits", "Blazer", "Sets"];
  if (name.includes("blazer")) return ["Blazer"];
  return ["Shirts", "T-shirt", "Sets", "Suits"];
}

export function ProductSuggestions({ campaignName, audience, contentTypes }: ProductSuggestionsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    const types = getRelevantTypes(campaignName, audience);
    const typeParam = types[0]; // fetch by primary type

    fetch(`/api/products?type=${encodeURIComponent(typeParam)}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        // Mix types by fetching all and filtering
        fetch(`/api/products?limit=100`)
          .then((r2) => r2.json())
          .then((all) => {
            const allProds: Product[] = all.products ?? [];
            const relevant = allProds
              .filter((p) => types.some((t) => p.type.toLowerCase().includes(t.toLowerCase())))
              .slice(0, 8);
            setProducts(relevant.length > 0 ? relevant : (d.products ?? []).slice(0, 8));
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, [campaignName, audience]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-surface-2 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <ShoppingBag className="w-3 h-3 text-muted" />
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
          Debackers Products — Use in Campaign
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {products.slice(0, 8).map((p) => (
          <div
            key={p.id}
            onClick={() => setSelected(selected?.id === p.id ? null : p)}
            className={`group relative cursor-pointer rounded-lg overflow-hidden border transition-all ${
              selected?.id === p.id
                ? "border-accent ring-1 ring-accent/30"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className="aspect-square relative overflow-hidden bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="p-1.5">
              <p className="text-[9px] text-foreground leading-tight truncate">{p.title}</p>
              <p className="text-[9px] text-accent font-bold mt-0.5">LE {parseFloat(p.price).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Product Detail */}
      {selected && (
        <div className="mt-3 bg-surface-2 rounded-lg p-3 flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.image} alt={selected.title} className="w-16 h-20 object-cover rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{selected.title}</p>
            <p className="text-[10px] text-muted mt-0.5">{selected.type}</p>
            <p className="text-xs font-bold text-accent mt-1">LE {parseFloat(selected.price).toLocaleString()}</p>
            <div className="flex gap-1 mt-2">
              {selected.images.slice(0, 3).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt="" className="w-8 h-10 object-cover rounded border border-border" />
              ))}
            </div>
          </div>
          <a
            href={`https://de-backers.com/products/${selected.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] text-accent hover:underline self-start"
          >
            View <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}
