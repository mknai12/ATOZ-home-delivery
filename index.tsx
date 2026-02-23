import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  ShoppingCart, 
  Search, 
  Coins, 
  ExternalLink, 
  Star, 
  ShoppingBag,
  Home,
  Gamepad2, 
  Zap,
  Eye,
  X,
  CheckCircle2,
  Loader2,
  Factory,
  User,
  MapPin,
  Headphones,
  Settings,
  LogOut,
  ChevronRight,
  Truck,
  Gift,
  Trophy,
  Lock,
  PartyPopper,
  Heart,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Check,
  Menu,
  Mic,
  Camera,
  Image as ImageIcon,
  Smartphone,
  Shirt,
  Watch,
  Utensils,
  Sofa,
  SprayCan,
  Baby,
  Dumbbell,
  Car,
  Hammer,
  Sprout,
  Pizza,
  Briefcase,
  Wand2,
  Download,
  AlertCircle,
  Newspaper,
  Calendar,
  XCircle
} from 'lucide-react';

// --- Configuration ---
// TO DO: Replace this with your actual Amazon Affiliate Tag
const AMAZON_AFFILIATE_ID = 'atozhomedel0b-21'; 

// --- AI Image Generation Utility ---
const imageCache = new Map<string, string>();

interface QueueItem {
  query: string;
  resolve: (url: string) => void;
  reject: () => void;
}

const generationQueue: QueueItem[] = [];
let isProcessing = false;
let isPaused = false;

const processQueue = async () => {
  if (isProcessing || isPaused || generationQueue.length === 0) return;

  isProcessing = true;
  const item = generationQueue.shift()!;
  const { query, resolve, reject } = item;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional product photography of ${query}, white background, studio lighting, high resolution, photorealistic, 4k. Ensure the product is centered and clearly visible.` }] },
    });

    let imageUrl = "";
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
    }

    if (imageUrl) {
      imageCache.set(query, imageUrl);
      resolve(imageUrl);
    } else {
      reject(); // No image in response
    }
  } catch (e: any) {
    console.error("AI Generation Error", e);
    
    // Check for Rate Limit (429) errors
    // Google GenAI error structure can vary, checking multiple properties
    const isRateLimit = 
        e.status === 429 || 
        (e.error && e.error.code === 429) || 
        (e.message && e.message.includes('429')) ||
        (JSON.stringify(e).includes('RESOURCE_EXHAUSTED'));

    if (isRateLimit) {
        console.warn("Rate limit hit. Pausing AI generation queue for 60 seconds.");
        generationQueue.unshift(item); // Put the item back at the front of the queue
        isPaused = true;
        
        setTimeout(() => {
            console.log("Resuming AI generation queue...");
            isPaused = false;
            processQueue();
        }, 60000); // Wait 60 seconds before retrying
        
        isProcessing = false;
        return; 
    }
    
    reject();
  } finally {
    if (!isPaused) {
        isProcessing = false;
        // Add a delay between requests to avoid hitting rate limits (approx 15 RPM for free tier safety)
        setTimeout(processQueue, 4000); 
    }
  }
};

const generateAIImage = (query: string): Promise<string> => {
  if (imageCache.has(query)) return Promise.resolve(imageCache.get(query)!);
  
  return new Promise((resolve, reject) => {
    generationQueue.push({ query, resolve, reject });
    processQueue();
  });
};

const SmartImage = ({ term, fallbackSrc, alt, className, onClick }: { term: string, fallbackSrc: string, alt: string, className?: string, onClick?: (e: any) => void }) => {
    const [src, setSrc] = useState<string | null>(imageCache.get(term) || null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (src) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (!imageCache.has(term)) {
                    setIsGenerating(true);
                    generateAIImage(term)
                        .then(url => {
                            if (isMounted.current) {
                                setSrc(url);
                                setIsGenerating(false);
                            }
                        })
                        .catch(() => {
                            if (isMounted.current) {
                                setError(true);
                                setIsGenerating(false);
                            }
                        });
                } else {
                    if (isMounted.current) {
                        setSrc(imageCache.get(term)!);
                    }
                }
                observer.disconnect();
            }
        });

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [term, src]);

    return (
        <div ref={containerRef} className="relative w-full h-full">
            <img 
                src={src || fallbackSrc} 
                alt={alt} 
                className={className} 
                onClick={onClick}
                loading="lazy"
            />
            {isGenerating && (
                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1.5 shadow-sm z-20 pointer-events-none border border-orange-100">
                   <Loader2 size={10} className="animate-spin text-orange-600" />
                   <span className="text-[8px] font-bold text-orange-600">AI Generating...</span>
                </div>
            )}
            {src && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-medium text-white pointer-events-none z-10 border border-white/10">
                   AI Generated
                </div>
            )}
        </div>
    );
};

// --- Types ---
type Source = 'Amazon' | 'Flipkart' | 'Meesho' | 'Snapdeal' | 'Indiamart';
type Category = string;
type Page = 'home' | 'wholesale' | 'orders' | 'rewards' | 'game' | 'wishlist';

interface VariantOption {
  id: string;
  label: string; // e.g. "Red", "XL", "128GB"
  price?: number; // Override price
  image?: string; // Override image
  colorCode?: string; // For color swatches e.g. "#FF0000"
}

interface VariantGroup {
  id: string; // "color", "size"
  name: string; // "Color", "Size"
  type: 'color' | 'text';
  options: VariantOption[];
}

interface Product {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  image: string;
  source: Source;
  category: Category;
  url: string;
  description: string;
  features: string[];
  isWholesale?: boolean;
  minOrderQty?: number;
  variantGroups?: VariantGroup[];
}

interface FilterState {
  sources: Source[];
  priceRange: { min: number | ''; max: number | '' };
  minRating: number;
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating';
}

// --- Confetti Component ---
const Confetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.1,
        opacity: 1
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.opacity <= 0) {
          particles.splice(index, 1);
        }
      });

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[100] pointer-events-none"
    />
  );
};

// --- Helper to add Affiliate Tag ---
const getAffiliateUrl = (url: string, source: Source) => {
  if (source === 'Amazon') {
    // If the URL already contains the affiliate tag, return it as is
    if (url.includes('tag=')) return url;
    
    // Check if URL already has query params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tag=${AMAZON_AFFILIATE_ID}`;
  }
  return url;
};

// --- Mock Data Generation ---

const BASE_RETAIL_PRODUCTS: Product[] = [
  // 1. Grocery & Daily Needs
  {
    id: 1,
    title: "Aashirvaad Shudh Chakki Atta",
    price: 240,
    originalPrice: 310,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Aashirvaad+Shudh+Chakki+Atta",
    description: "100% whole wheat atta with 0% maida. Made with the 4-step advantage process for soft rotis.",
    features: ["100% Whole Wheat", "0% Maida", "High Fibre", "Soft Rotis"],
    variantGroups: [
        {
            id: "size",
            name: "Pack Size",
            type: "text",
            options: [
                { id: "1kg", label: "1 Kg", price: 60 },
                { id: "5kg", label: "5 Kg", price: 240 },
                { id: "10kg", label: "10 Kg", price: 450 }
            ]
        }
    ]
  },
  {
    id: 2,
    title: "Fortune Sunlite Refined Sunflower Oil",
    price: 135,
    originalPrice: 160,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcdcc41?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Grocery & Daily Needs",
    url: "https://www.flipkart.com/search?q=Fortune+Sunlite+Refined+Sunflower+Oil",
    description: "Light and healthy sunflower oil, perfect for indian cooking. Enriched with vitamins A and D.",
    features: ["Light & Healthy", "Vitamin Enriched", "Heart Friendly", "High Smoke Point"]
  },
  // Added 20 Random Grocery Items
  {
    id: 201,
    title: "Tata Salt, 1kg",
    price: 28,
    originalPrice: 32,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1626077399587-ddce1e2ed767?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Tata+Salt",
    description: "Vacuum evaporated iodized salt for your daily cooking needs.",
    features: ["Iodized", "Vacuum Evaporated", "Pantry Staple", "Vegetarian"]
  },
  {
    id: 202,
    title: "Brooke Bond Red Label Tea, 500g",
    price: 240,
    originalPrice: 280,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Grocery & Daily Needs",
    url: "https://www.flipkart.com/search?q=Red+Label+Tea",
    description: "High quality granular tea with superior taste and aroma.",
    features: ["Granular Tea", "Rich Aroma", "Strong Taste", "Daily Chai"]
  },
  {
    id: 203,
    title: "Maggi 2-Minute Noodles (Pack of 12)",
    price: 168,
    originalPrice: 180,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Maggi",
    description: "India's favorite instant noodles. Ready in 2 minutes.",
    features: ["Instant Noodles", "Masala Flavor", "Iron Fortified", "Snack"]
  },
  {
    id: 204,
    title: "Madhur Pure Sugar, 1kg",
    price: 48,
    originalPrice: 60,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Sugar",
    description: "Sulphur free pure cane sugar crystals.",
    features: ["Sulphur Free", "Pure Crystals", "Refined", "Sweetener"]
  },
  {
    id: 205,
    title: "Daawat Rozana Gold Basmati Rice, 5kg",
    price: 399,
    originalPrice: 550,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Daawat+Rice",
    description: "Daily use basmati rice with long grains and aromatic flavor.",
    features: ["Basmati", "Long Grain", "Aromatic", "Daily Use"]
  },
  {
    id: 206,
    title: "Tata Sampann Toor Dal, 1kg",
    price: 155,
    originalPrice: 190,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1585996656828-09f0df48324f?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Grocery & Daily Needs",
    url: "https://www.flipkart.com/search?q=Toor+Dal",
    description: "Unpolished toor dal rich in protein.",
    features: ["Unpolished", "High Protein", "Natural Taste", "Indian Pulse"]
  },
  {
    id: 207,
    title: "Fortune Besan, 500g",
    price: 55,
    originalPrice: 70,
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1628105747659-543e26095931?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Besan",
    description: "100% chana dal besan, perfect for pakoras and sweets.",
    features: ["100% Chana Dal", "Fine Flour", "Gluten Free", "Versatile"]
  },
  {
    id: 208,
    title: "Amul Pure Ghee, 1L",
    price: 640,
    originalPrice: 700,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Amul+Ghee",
    description: "Pure cow ghee with rich aroma and granular texture.",
    features: ["Cow Ghee", "Rich Aroma", "Traditional", "Healthy Fat"]
  },
  {
    id: 209,
    title: "Dhara Mustard Oil, 1L",
    price: 145,
    originalPrice: 180,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1596627749667-43152d4d9892?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Grocery & Daily Needs",
    url: "https://www.flipkart.com/search?q=Mustard+Oil",
    description: "Kachi Ghani mustard oil for authentic Indian cooking.",
    features: ["Kachi Ghani", "Pungent", "Authentic Taste", "Cooking Oil"]
  },
  {
    id: 210,
    title: "Happilo California Almonds, 200g",
    price: 249,
    originalPrice: 399,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1508061461508-a0d926d577a2?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Almonds",
    description: "Premium quality raw almonds, rich in Vitamin E.",
    features: ["Premium Quality", "Raw", "Nutritious", "Snack"]
  },
  {
    id: 211,
    title: "Parle-G Gold Biscuits (1kg)",
    price: 120,
    originalPrice: 140,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=500",
    source: "Meesho",
    category: "Grocery & Daily Needs",
    url: "https://www.meesho.com/search?q=Parle+G",
    description: "The genius choice. Glucose biscuits for tea time.",
    features: ["Glucose", "Kids Favorite", "Tea Time Snack", "Value Pack"]
  },
  {
    id: 212,
    title: "Colgate Strong Teeth Toothpaste, 500g",
    price: 230,
    originalPrice: 260,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1559599238-308793637427?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Colgate",
    description: "Calcium boost toothpaste for strong teeth and fresh breath.",
    features: ["Calcium Boost", "Anti-Cavity", "Fresh Breath", "Family Pack"]
  },
  {
    id: 213,
    title: "Dettol Original Soap (Pack of 4)",
    price: 180,
    originalPrice: 220,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Grocery & Daily Needs",
    url: "https://www.flipkart.com/search?q=Dettol+Soap",
    description: "Germ protection bathing soap for the whole family.",
    features: ["Germ Protection", "Antiseptic", "Daily Use", "Value Pack"]
  },
  {
    id: 214,
    title: "Dove Hair Fall Rescue Shampoo, 650ml",
    price: 550,
    originalPrice: 750,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Dove+Shampoo",
    description: "Nourishing shampoo that reduces hair fall by up to 98%.",
    features: ["Hair Fall Control", "Nourishing", "Mild", "Large Pack"]
  },
  {
    id: 215,
    title: "Tide Plus Double Power Detergent, 4kg",
    price: 499,
    originalPrice: 600,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Tide+Detergent",
    description: "Washing powder with jasmine and rose fragrance. Removes dirt effectively.",
    features: ["Double Power", "Fragrant", "Whitening", "Bucket Wash"]
  },
  {
    id: 216,
    title: "Vim Dishwash Bar (Pack of 3)",
    price: 60,
    originalPrice: 75,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1585834925023-718818f4a138?auto=format&fit=crop&q=80&w=500",
    source: "Meesho",
    category: "Grocery & Daily Needs",
    url: "https://www.meesho.com/search?q=Vim+Bar",
    description: "Lemon power dishwash bar that removes tough grease.",
    features: ["Lemon Power", "Grease Removal", "Long Lasting", "Economical"]
  },
  {
    id: 217,
    title: "Harpic Power Plus Toilet Cleaner, 1L",
    price: 199,
    originalPrice: 225,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Harpic",
    description: "Disinfectant toilet cleaner, kills 99.9% germs.",
    features: ["Disinfectant", "Kills Germs", "Stain Removal", "Original Scent"]
  },
  {
    id: 218,
    title: "Lizol Floor Cleaner (Citrus), 2L",
    price: 360,
    originalPrice: 420,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1626154546415-46549298e353?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Lizol",
    description: "Disinfectant surface cleaner suitable for all floors.",
    features: ["Disinfectant", "Citrus Scent", "Multi-surface", "Germ Kill"]
  },
  {
    id: 219,
    title: "All Out Ultra Refill (Pack of 4)",
    price: 280,
    originalPrice: 320,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1620917670397-a73426720d7d?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Grocery & Daily Needs",
    url: "https://www.flipkart.com/search?q=All+Out",
    description: "Mosquito repellant refill for a peaceful sleep.",
    features: ["Mosquito Repellent", "Ultra Power", "Safe", "Combo Pack"]
  },
  {
    id: 220,
    title: "Kissan Mixed Fruit Jam, 500g",
    price: 155,
    originalPrice: 170,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Grocery & Daily Needs",
    url: "https://www.amazon.in/s?k=Kissan+Jam",
    description: "Delicious mixed fruit jam made with real fruit pulp.",
    features: ["Real Fruit", "Sweet", "Breakfast Staple", "Spread"]
  },

  // 2. Fruits & Vegetables
  {
    id: 3,
    title: "Fresh Kashmiri Apples",
    price: 180,
    originalPrice: 250,
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Fruits & Vegetables",
    url: "https://www.amazon.in/s?k=Fresh+Kashmiri+Apples",
    description: "Crunchy and sweet apples directly from Kashmiri orchards. Rich in fiber and antioxidants.",
    features: ["Farm Fresh", "Sweet & Crunchy", "Washed", "Premium Quality"]
  },
  {
    id: 4,
    title: "Organic Red Onions (1kg)",
    price: 45,
    originalPrice: 60,
    rating: 4.2,
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Fruits & Vegetables",
    url: "https://www.amazon.in/s?k=Onions",
    description: "Fresh organic red onions, essential for daily indian cooking. Sourced from organic farms.",
    features: ["Organic", "Fresh Harvest", "Pungent Taste", "Daily Essential"]
  },

  // 3. Dairy & Bakery
  {
    id: 5,
    title: "Amul Butter Pasteurised",
    price: 54,
    originalPrice: 58,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Dairy & Bakery",
    url: "https://www.flipkart.com/search?q=Amul+Butter",
    description: "Utterly Butterly Delicious. Made from pure milk fat. A taste of India.",
    features: ["Pasteurised", "Salted", "Rich Taste", "Vegetarian"]
  },
  {
    id: 6,
    title: "Britannia 100% Whole Wheat Bread",
    price: 50,
    originalPrice: 55,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Dairy & Bakery",
    url: "https://www.amazon.in/s?k=Britannia+Bread",
    description: "Soft and fresh whole wheat bread. High in fibre and essential nutrients.",
    features: ["Whole Wheat", "High Fibre", "Soft", "Fresh"]
  },

  // 4. Personal Care
  {
    id: 7,
    title: "Nivea Men Dark Spot Reduction Face Wash",
    price: 149,
    originalPrice: 199,
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Personal Care",
    url: "https://www.amazon.in/s?k=Nivea+Men+Face+Wash",
    description: "10x Vitamin C effect for clean, bright and clear skin. Reduces dark spots.",
    features: ["Dark Spot Reduction", "Vitamin C", "Deep Clean", "For Men"]
  },
  
  // 5. Health & Wellness
  {
    id: 8,
    title: "Revital H for Men (30 Capsules)",
    price: 265,
    originalPrice: 330,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Health & Wellness",
    url: "https://www.amazon.in/s?k=Revital+H",
    description: "Daily health supplement with Ginseng, Vitamins and Minerals to keep you active.",
    features: ["Energy Booster", "Contains Ginseng", "Immunity Support", "Daily Supplement"]
  },

  // 6. Baby Care
  {
    id: 9,
    title: "Pampers All round Protection Pants",
    price: 699,
    originalPrice: 999,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Baby Care",
    url: "https://www.amazon.in/s?k=Pampers",
    description: "Anti-rash diapers with aloe vera lotion. Up to 12 hours absorption.",
    features: ["Anti-Rash", "Aloe Vera", "12h Absorption", "Leak Lock"]
  },

  // 7. Household & Cleaning
  {
    id: 10,
    title: "Surf Excel Matic Liquid Detergent",
    price: 430,
    originalPrice: 490,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1585834925023-718818f4a138?auto=format&fit=crop&q=80&w=500", // Generic bottle
    source: "Amazon",
    category: "Household & Cleaning",
    url: "https://www.amazon.in/s?k=Surf+Excel+Matic",
    description: "Liquid detergent for top load washing machines. Tough stain removal.",
    features: ["No Residue", "Tough Stains", "Fresh Fragrance", "Color Care"]
  },

  // 8. Home & Kitchen
  {
    id: 11,
    title: "Prestige 3L Pressure Cooker",
    price: 1500,
    originalPrice: 2100,
    rating: 4.2,
    image: "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d1f?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Home & Kitchen",
    url: "https://www.amazon.in/s?k=Prestige+Pressure+Cooker",
    description: "Durable aluminium pressure cooker with outer lid. Induction base.",
    features: ["3 Litres", "Aluminium", "Induction Base", "5 Year Warranty"]
  },

  // 9. Electronics & Appliances
  {
    id: 15,
    title: "Samsung Galaxy M34 5G",
    price: 15999,
    originalPrice: 24999,
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Electronics & Appliances",
    url: "https://www.amazon.in/s?k=Samsung+Galaxy+M34+5G",
    description: "120Hz Super AMOLED Display, 50MP No Shake Camera, and 6000mAh Battery.",
    features: ["50MP Camera", "6000mAh Battery", "120Hz sAMOLED", "5G Ready"],
    variantGroups: [
      {
        id: "color",
        name: "Color",
        type: "color",
        options: [
          { id: "blue", label: "Midnight Blue", colorCode: "#1a237e", image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=500" },
          { id: "silver", label: "Prism Silver", colorCode: "#e0e0e0", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=500" }
        ]
      },
      {
        id: "storage",
        name: "Storage",
        type: "text",
        options: [
          { id: "128gb", label: "128 GB", price: 15999 },
          { id: "256gb", label: "256 GB", price: 18999 }
        ]
      }
    ]
  },
  
  // 10. Fashion & Apparel
  {
    id: 16,
    title: "Levi's Men's 511 Slim Fit Jeans",
    price: 1899,
    originalPrice: 3299,
    rating: 4.2,
    image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Fashion & Apparel",
    url: "https://www.amazon.in/s?k=Levis+Mens+511+Slim+Fit+Jeans",
    description: "Classic slim fit jeans made with stretchable denim for comfort and style.",
    features: ["Slim Fit", "Stretch Denim", "Zip Fly", "5 Pocket Styling"],
    variantGroups: [
        {
            id: "size",
            name: "Waist Size",
            type: "text",
            options: [
                { id: "30", label: "30" },
                { id: "32", label: "32" },
                { id: "34", label: "34" },
                { id: "36", label: "36" }
            ]
        },
        {
            id: "color",
            name: "Color",
            type: "color",
            options: [
                { id: "blue", label: "Blue", colorCode: "#0d47a1", image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&q=80&w=500" },
                { id: "black", label: "Black", colorCode: "#212121", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=500" }
            ]
        }
    ]
  },

  // 11. Jewellery & Accessories
  {
    id: 17,
    title: "Titan Neo Men's Analog Watch",
    price: 4595,
    originalPrice: 5995,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1524592094765-f787163c6968?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Jewellery & Accessories",
    url: "https://www.amazon.in/s?k=Titan+Mens+Watch",
    description: "Sophisticated analog watch with black dial and leather strap.",
    features: ["Mineral Glass", "Water Resistant", "Leather Strap", "Analog"]
  },

  // 12. Stationery & Office Supplies
  {
    id: 18,
    title: "Classmate Pulse 6-Subject Notebook",
    price: 240,
    originalPrice: 280,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1531346878377-a513bc95f87b?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Stationery & Office Supplies",
    url: "https://www.amazon.in/s?k=Classmate+Notebook",
    description: "Spiral bound notebook with 300 pages and subject separators.",
    features: ["Spiral Bound", "300 Pages", "Whiter Paper", "6 Subjects"]
  },

  // 13. Sports & Fitness
  {
    id: 19,
    title: "Yonex GR 303 Badminton Racquet",
    price: 699,
    originalPrice: 990,
    rating: 4.1,
    image: "https://images.unsplash.com/photo-1626224583764-847890e045b5?auto=format&fit=crop&q=80&w=500",
    source: "Flipkart",
    category: "Sports & Fitness",
    url: "https://www.flipkart.com/search?q=Yonex+Badminton",
    description: "Durable aluminium frame racquet. Perfect for beginners.",
    features: ["Aluminium Frame", "Lightweight", "Durable", "Cover Included"]
  },

  // 14. Toys, Games & Hobbies
  {
    id: 20,
    title: "LEGO Classic Creative Brick Box",
    price: 1499,
    originalPrice: 1799,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1587654780291-39c940483719?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Toys, Games & Hobbies",
    url: "https://www.amazon.in/s?k=LEGO+Classic",
    description: "Build anything you can imagine with this set of 33 different colored bricks.",
    features: ["484 Pieces", "33 Colors", "Storage Box", "Creative Play"]
  },

  // 15. Automotive
  {
    id: 21,
    title: "Vega Off Road Helmet",
    price: 1850,
    originalPrice: 2150,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1558564263-d3c52a3536fa?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Automotive",
    url: "https://www.amazon.in/s?k=Vega+Helmet",
    description: "High impact ABS material shell helmet with superior ventilation.",
    features: ["ISI Certified", "Air Vents", "Scratch Resistant", "Removable Lining"],
    variantGroups: [
        {
            id: "size",
            name: "Size",
            type: "text",
            options: [
                { id: "m", label: "M" },
                { id: "l", label: "L" }
            ]
        }
    ]
  },

  // 16. Construction & Hardware
  {
    id: 22,
    title: "Bosch Professional Impact Drill",
    price: 2899,
    originalPrice: 4500,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Construction & Hardware",
    url: "https://www.amazon.in/s?k=Bosch+Drill",
    description: "Powerful 550W motor suitable for drilling in concrete, wood and metal.",
    features: ["550W Power", "Impact Function", "Variable Speed", "Ergonomic"]
  },

  // 17. Food & Restaurant
  {
    id: 23,
    title: "Domino's Pizza E-Gift Voucher",
    price: 500,
    originalPrice: 500,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=500",
    source: "Amazon",
    category: "Food & Restaurant",
    url: "https://www.amazon.in/s?k=Dominos+Voucher",
    description: "Instant e-gift voucher for Domino's Pizza. Redeemable online or in-store.",
    features: ["Instant Delivery", "1 Year Validity", "Easy Redeem", "Great Gift"]
  }
];

const BASE_WHOLESALE_PRODUCTS: Product[] = [
  {
    id: 101,
    title: "Industrial Heavy Duty Sewing Machine",
    price: 15000,
    originalPrice: 18000,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?auto=format&fit=crop&q=80&w=500",
    source: "Indiamart",
    category: "Industrial Machinery",
    url: "https://www.indiamart.com/proddetail/industrial-sewing-machine",
    description: "High speed single needle lockstitch industrial sewing machine for heavy fabrics.",
    features: ["5000 SPM Speed", "Automatic Lubrication", "Energy Saving Motor", "Heavy Duty"],
    isWholesale: true,
    minOrderQty: 5
  },
  {
    id: 102,
    title: "Cotton Lycra Fabric Roll (100kg)",
    price: 450,
    originalPrice: 550,
    rating: 4.2,
    image: "https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&q=80&w=500",
    source: "Indiamart",
    category: "Textiles & Fabrics",
    url: "https://www.indiamart.com/proddetail/cotton-lycra-fabric",
    description: "Premium quality 4-way stretch cotton lycra fabric for garments.",
    features: ["95% Cotton 5% Spandex", "GSM 180-220", "Bio Washed", "Reactive Dyeing"],
    isWholesale: true,
    minOrderQty: 100
  },
   {
    id: 103,
    title: "Corrugated Packaging Boxes (Brown)",
    price: 15,
    originalPrice: 22,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1589407355263-d0e829759d58?auto=format&fit=crop&q=80&w=500",
    source: "Indiamart",
    category: "Packaging Material",
    url: "https://www.indiamart.com/proddetail/corrugated-boxes",
    description: "3 Ply and 5 Ply corrugated boxes for shipping and storage.",
    features: ["High Strength", "Custom Sizes", "Eco Friendly", "Recyclable"],
    isWholesale: true,
    minOrderQty: 500
  },
  {
    id: 104,
    title: "Organic Fertilizer Granules (50kg Bag)",
    price: 850,
    originalPrice: 1200,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1628102491629-778571d893a3?auto=format&fit=crop&q=80&w=500",
    source: "Indiamart",
    category: "Agriculture & Farming",
    url: "https://www.indiamart.com/proddetail/organic-fertilizer",
    description: "Slow release organic fertilizer for all types of crops.",
    features: ["100% Organic", "Soil Conditioner", "Higher Yield", "Eco Friendly"],
    isWholesale: true,
    minOrderQty: 50
  },
  {
    id: 105,
    title: "Electronic Capacitor Components",
    price: 2,
    originalPrice: 5,
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1563770095-39d468f95c83?auto=format&fit=crop&q=80&w=500",
    source: "Indiamart",
    category: "Electronics Components",
    url: "https://www.indiamart.com/proddetail/capacitors",
    description: "Assorted electrolytic and ceramic capacitors for electronics manufacturing.",
    features: ["High Reliability", "Low ESR", "Long Life", "Bulk Pack"],
    isWholesale: true,
    minOrderQty: 1000
  },
  {
      id: 106,
      title: "Industrial Solvent Chemicals",
      price: 1200,
      originalPrice: 1500,
      rating: 4.4,
      image: "https://images.unsplash.com/photo-1616422204631-f1f31ce59c63?auto=format&fit=crop&q=80&w=500",
      source: "Indiamart",
      category: "Chemicals & Solvents",
      url: "https://www.indiamart.com/proddetail/solvents",
      description: "Industrial grade cleaning solvents and chemicals.",
      features: ["99% Purity", "Industrial Grade", "Safety Certified", "Bulk Drums"],
      isWholesale: true,
      minOrderQty: 10
  },
  {
      id: 107,
      title: "Red Brick Construction Material",
      price: 8,
      originalPrice: 12,
      rating: 4.1,
      image: "https://images.unsplash.com/photo-1590059530492-d352b6188e7e?auto=format&fit=crop&q=80&w=500",
      source: "Indiamart",
      category: "Construction Material",
      url: "https://www.indiamart.com/proddetail/red-bricks",
      description: "Standard size red clay bricks for construction.",
      features: ["High Strength", "Uniform Shape", "Low Water Absorption", "Durable"],
      isWholesale: true,
      minOrderQty: 2000
  }
];

const generateExtendedProducts = (baseProducts: Product[], targetPerCategory: number): Product[] => {
  const extendedProducts: Product[] = [];
  const variations = [
    { suffix: " - Family Pack", priceMult: 1.5, note: "Extra Value" },
    { suffix: " (Premium)", priceMult: 1.2, note: "High Quality" },
    { suffix: " - Small", priceMult: 0.8, note: "Travel Size" },
    { suffix: " - Large", priceMult: 1.3, note: "Mega Pack" },
    { suffix: " (New Arrival)", priceMult: 1.1, note: "Latest Stock" },
  ];
  const sources: Source[] = ['Amazon', 'Flipkart', 'Meesho', 'Snapdeal'];

  const productsByCategory: Record<string, Product[]> = {};
  baseProducts.forEach(p => {
    if (!productsByCategory[p.category]) productsByCategory[p.category] = [];
    productsByCategory[p.category].push(p);
  });

  Object.keys(productsByCategory).forEach(category => {
    const categoryBase = productsByCategory[category];
    let createdCount = 0;
    
    categoryBase.forEach(p => {
      extendedProducts.push({ ...p, url: getAffiliateUrl(p.url, p.source) });
      createdCount++;
    });

    let i = 0;
    while (createdCount < targetPerCategory) {
      const base = categoryBase[i % categoryBase.length];
      const variant = variations[createdCount % variations.length];
      const newPrice = Math.floor(base.price * variant.priceMult);
      const newOriginalPrice = Math.floor(base.originalPrice * variant.priceMult);
      const source = base.isWholesale ? 'Indiamart' : sources[Math.floor(Math.random() * sources.length)];
      
      extendedProducts.push({
        ...base,
        id: 10000 + extendedProducts.length,
        title: `${base.title}${variant.suffix}`,
        price: newPrice,
        originalPrice: newOriginalPrice,
        source: source,
        url: getAffiliateUrl(base.url, source),
      });
      createdCount++;
      i++;
    }
  });
  return extendedProducts;
};

// Re-generate massive lists
const RETAIL_PRODUCTS = generateExtendedProducts(BASE_RETAIL_PRODUCTS, 200);
const WHOLESALE_PRODUCTS = generateExtendedProducts(BASE_WHOLESALE_PRODUCTS, 50);

const RETAIL_CATEGORIES = [
  { name: 'All', icon: Home },
  { name: 'Grocery & Daily Needs', icon: ShoppingBag },
  { name: 'Fruits & Vegetables', icon: Sprout },
  { name: 'Dairy & Bakery', icon: Utensils },
  { name: 'Personal Care', icon: SprayCan },
  { name: 'Health & Wellness', icon: Heart },
  { name: 'Baby Care', icon: Baby },
  { name: 'Household & Cleaning', icon: Home },
  { name: 'Home & Kitchen', icon: Sofa },
  { name: 'Electronics & Appliances', icon: Smartphone },
  { name: 'Fashion & Apparel', icon: Shirt },
  { name: 'Jewellery & Accessories', icon: Watch },
  { name: 'Stationery & Office Supplies', icon: Briefcase },
  { name: 'Sports & Fitness', icon: Dumbbell },
  { name: 'Toys, Games & Hobbies', icon: Gamepad2 },
  { name: 'Automotive', icon: Car },
  { name: 'Construction & Hardware', icon: Hammer },
  { name: 'Food & Restaurant', icon: Pizza },
];

const WHOLESALE_CATEGORIES = [
  'Industrial Machinery',
  'Textiles & Fabrics',
  'Construction Material',
  'Electronics Components',
  'Packaging Material',
  'Agriculture & Farming',
  'Chemicals & Solvents'
];

const CATEGORIES: Category[] = RETAIL_CATEGORIES.map(c => c.name);

// --- Variant Selector Hook ---
const useVariantSelection = (product: Product | null) => {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product?.variantGroups) {
        const defaults: Record<string, string> = {};
        product.variantGroups.forEach(group => {
            if (group.options.length > 0) {
                defaults[group.id] = group.options[0].id;
            }
        });
        setSelectedVariants(defaults);
    } else {
        setSelectedVariants({});
    }
  }, [product?.id]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    let price = product.price;
    if (product.variantGroups) {
        product.variantGroups.forEach(group => {
            const selectedId = selectedVariants[group.id];
            const option = group.options.find(o => o.id === selectedId);
            if (option?.price) {
                price = option.price;
            }
        });
    }
    return price;
  }, [product, selectedVariants]);

  const currentImage = useMemo(() => {
      if (!product) return '';
      let img = product.image;
      if (product.variantGroups) {
        product.variantGroups.forEach(group => {
            const selectedId = selectedVariants[group.id];
            const option = group.options.find(o => o.id === selectedId);
            if (option?.image) {
                img = option.image;
            }
        });
      }
      return img;
  }, [product, selectedVariants]);

  const selectVariant = (groupId: string, optionId: string) => {
      setSelectedVariants(prev => ({...prev, [groupId]: optionId}));
  };

  return { selectedVariants, selectVariant, currentPrice, currentImage };
};

// --- Components ---

const Sidebar = ({ 
  isOpen, 
  onClose, 
  onSelectCategory,
  selectedCategory,
  onSelectWholesale
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSelectCategory: (c: string) => void,
  selectedCategory: string,
  onSelectWholesale: () => void
}) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 left-0 h-full w-[280px] bg-white z-[90] shadow-2xl transform transition-transform duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
           <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                 <User size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg">Hello, Guest</h2>
                <p className="text-xs text-orange-100">Sign in for best experience</p>
              </div>
           </div>
        </div>

        <div className="p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Shop By Category</h3>
          <div className="space-y-1">
            {RETAIL_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => { onSelectCategory(cat.name); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selectedCategory === cat.name 
                  ? 'bg-orange-50 text-orange-600 font-bold' 
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <cat.icon size={18} className={selectedCategory === cat.name ? "text-orange-500" : "text-gray-400"} />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="my-4 border-t border-gray-100"></div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Wholesale Market</h3>
          <div className="space-y-1">
             <button
                onClick={() => { onSelectWholesale(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold"
              >
                <Factory size={18} />
                All Wholesale Items
              </button>
             {WHOLESALE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { onSelectWholesale(); onClose(); }} // Simulating wholesale selection filtering
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                <ChevronRight size={16} className="text-gray-300" />
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const SourceBadge = ({ source }: { source: Source }) => {
  const colors: Record<Source, string> = {
    'Amazon': 'bg-slate-800 text-white',
    'Flipkart': 'bg-blue-600 text-white',
    'Meesho': 'bg-pink-600 text-white',
    'Snapdeal': 'bg-red-600 text-white',
    'Indiamart': 'bg-red-700 text-white'
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[source]} shadow-sm`}>
      {source}
    </span>
  );
};

const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full animate-pulse">
    <div className="h-44 bg-gray-200" />
    <div className="p-4 flex-1 flex flex-col gap-3">
      <div className="h-3 w-10 bg-gray-200 rounded" />
      <div className="space-y-1">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-2/3 bg-gray-200 rounded" />
      </div>
      <div className="mt-auto pt-2">
         <div className="flex gap-2 mb-3">
             <div className="h-6 w-20 bg-gray-200 rounded" />
             <div className="h-4 w-12 bg-gray-200 rounded" />
         </div>
         <div className="h-10 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  </div>
);

const FilterModal = ({ 
  isOpen, 
  onClose, 
  filters, 
  setFilters,
  onReset
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  filters: FilterState, 
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
  onReset: () => void
}) => {
  if (!isOpen) return null;

  const sources: Source[] = ['Amazon', 'Flipkart', 'Meesho', 'Snapdeal'];

  const toggleSource = (s: Source) => {
    setFilters(prev => ({
      ...prev,
      sources: prev.sources.includes(s) 
        ? prev.sources.filter(item => item !== s) 
        : [...prev.sources, s]
    }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center pointer-events-none">
       <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl pointer-events-auto transform transition-all animate-in slide-in-from-bottom-10 flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Filters</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Sort By */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Sort By</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'relevance', label: 'Relevance' },
                { id: 'price_low', label: 'Price: Low to High' },
                { id: 'price_high', label: 'Price: High to Low' },
                { id: 'rating', label: 'Top Rated' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: opt.id as any }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    filters.sortBy === opt.id 
                    ? 'bg-orange-50 border-orange-200 text-orange-700' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sources */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Brand / Source</h3>
            <div className="grid grid-cols-2 gap-2">
              {sources.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  className={`px-3 py-3 rounded-xl border flex items-center justify-between transition-all ${
                    filters.sources.includes(s)
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xs font-bold">{s}</span>
                  {filters.sources.includes(s) && <Check size={14} />}
                </button>
              ))}
            </div>
          </section>

          {/* Price Range */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Price Range (₹)</h3>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-gray-400 text-xs">Min</span>
                <input 
                  type="number"
                  value={filters.priceRange.min}
                  onChange={(e) => setFilters(prev => ({...prev, priceRange: { ...prev.priceRange, min: Number(e.target.value) }}))}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-gray-400 text-xs">Max</span>
                <input 
                  type="number"
                  value={filters.priceRange.max}
                  onChange={(e) => setFilters(prev => ({...prev, priceRange: { ...prev.priceRange, max: Number(e.target.value) }}))}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="Max"
                />
              </div>
            </div>
          </section>

          {/* Rating */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Minimum Rating</h3>
            <div className="flex flex-col gap-2">
              {[4, 3, 2, 1].map(r => (
                <button 
                  key={r}
                  onClick={() => setFilters(prev => ({ ...prev, minRating: r }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                    filters.minRating === r 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={i < r ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
                    ))}
                  </div>
                  <span className="text-xs font-medium">& Up</span>
                  {filters.minRating === r && <CheckCircle2 size={16} className="ml-auto text-yellow-600" />}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex gap-3">
          <button 
            onClick={onReset}
            className="px-6 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
          >
            Reset
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveFilters = ({ 
  filters, 
  setFilters,
  onReset
}: { 
  filters: FilterState, 
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
  onReset: () => void
}) => {
  const hasFilters = filters.sources.length > 0 || filters.priceRange.min !== '' || filters.priceRange.max !== '' || filters.minRating > 0;

  if (!hasFilters) return null;

  const removeSource = (source: Source) => {
    setFilters(prev => ({
      ...prev,
      sources: prev.sources.filter(s => s !== source)
    }));
  };

  const removePrice = () => {
    setFilters(prev => ({
      ...prev,
      priceRange: { min: '', max: '' }
    }));
  };

  const removeRating = () => {
    setFilters(prev => ({
      ...prev,
      minRating: 0
    }));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
      <button 
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-xs font-bold whitespace-nowrap shadow-sm hover:bg-black transition-colors"
      >
        <XCircle size={14} />
        Clear All
      </button>

      {filters.sources.map(source => (
        <button
          key={source}
          onClick={() => removeSource(source)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-bold whitespace-nowrap shadow-sm hover:bg-gray-50 transition-colors"
        >
          {source}
          <X size={12} className="text-gray-400" />
        </button>
      ))}

      {(filters.priceRange.min !== '' || filters.priceRange.max !== '') && (
        <button
          onClick={removePrice}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-bold whitespace-nowrap shadow-sm hover:bg-gray-50 transition-colors"
        >
          ₹{filters.priceRange.min || 0} - ₹{filters.priceRange.max || 'Any'}
          <X size={12} className="text-gray-400" />
        </button>
      )}

      {filters.minRating > 0 && (
        <button
          onClick={removeRating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-bold whitespace-nowrap shadow-sm hover:bg-gray-50 transition-colors"
        >
          {filters.minRating}★ & Up
          <X size={12} className="text-gray-400" />
        </button>
      )}
    </div>
  );
};

const Header = ({ 
  coins, 
  currentPage, 
  onFilterClick,
  activeFiltersCount,
  onMenuClick,
  setSearchQuery
}: { 
  coins: number, 
  currentPage: Page, 
  onFilterClick: () => void,
  activeFiltersCount: number,
  onMenuClick: () => void,
  setSearchQuery: (q: string) => void
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const startVoiceSearch = () => {
    setIsListening(true);
    // Simulate voice recognition
    setTimeout(() => {
        setIsListening(false);
        setSearchQuery("Bluetooth Headphones"); // Mock result
    }, 2000);
  };

  const startImageSearch = () => {
    setIsScanning(true);
    // Simulate image scanning
    setTimeout(() => {
        setIsScanning(false);
        setSearchQuery("Running Shoes"); // Mock result
    }, 2000);
  };

  const getTitle = () => {
    switch (currentPage) {
      case 'wholesale': return 'Wholesale Hub';
      case 'game': return 'Daily Spin'; 
      case 'orders': return 'My Orders';
      case 'rewards': return 'Rewards';
      case 'wishlist': return 'My Wishlist';
      default: return 'Atoz Home';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg z-50 rounded-b-[20px]">
      <div className="max-w-md mx-auto px-5 h-16 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onMenuClick}
            className="bg-white/20 backdrop-blur-sm p-2 rounded-xl text-white border border-white/20 hover:bg-white/30 transition-colors"
          >
             <Menu size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">{getTitle()}</h1>
            {currentPage === 'home' && <p className="text-[10px] opacity-90 leading-none text-orange-100">Best Deals Aggregator</p>}
            {currentPage === 'wholesale' && <p className="text-[10px] opacity-90 leading-none text-orange-100">Powered by Indiamart</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-inner">
            <Coins size={16} className="text-yellow-300" fill="currentColor" />
            <span className="font-bold text-sm">{coins}</span>
          </div>
        </div>
      </div>
      
      {(currentPage === 'home' || currentPage === 'wholesale') && (
        <div className="max-w-md mx-auto px-5 pb-5">
          <div className="flex gap-2">
            <div className="relative group flex-1">
              <input 
                type="text" 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isListening ? "Listening..." : isScanning ? "Scanning..." : (currentPage === 'wholesale' ? "Search industrial goods..." : "Search products...")}
                className="w-full h-11 pl-10 pr-20 rounded-2xl bg-white text-gray-800 focus:outline-none focus:ring-4 focus:ring-orange-500/30 shadow-lg shadow-orange-600/20 transition-all placeholder:text-gray-400 font-medium"
              />
              <Search className="absolute left-3.5 top-3 text-gray-400" size={20} />
              
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                 <button 
                    onClick={startVoiceSearch}
                    className={`p-1.5 rounded-lg transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-orange-500 hover:bg-gray-50'}`}
                 >
                    <Mic size={18} />
                 </button>
                 <button 
                    onClick={startImageSearch}
                    className={`p-1.5 rounded-lg transition-colors ${isScanning ? 'bg-blue-500 text-white animate-pulse' : 'text-gray-400 hover:text-orange-500 hover:bg-gray-50'}`}
                 >
                    <Camera size={18} />
                 </button>
              </div>
            </div>
            
            <button 
              onClick={onFilterClick}
              className={`h-11 w-11 flex items-center justify-center rounded-2xl shadow-lg transition-all active:scale-95 relative ${
                activeFiltersCount > 0 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-500 hover:text-orange-600'
              }`}
            >
              <SlidersHorizontal size={20} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

const BannerSlider = () => (
  <div className="mt-4 mb-6 px-4">
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden h-40 flex items-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/20 rounded-full blur-xl -ml-10 -mb-5"></div>
        <div className="relative z-10 w-2/3">
            <span className="bg-orange-500 text-[10px] font-bold px-2 py-1 rounded-md mb-2 inline-block">FEATURED</span>
            <h3 className="font-bold text-xl mb-1">Super Sale Live!</h3>
            <p className="text-xs text-gray-300 mb-3">Up to 70% off on Electronics</p>
            <button className="bg-white text-indigo-900 text-xs font-bold px-4 py-2 rounded-full">Shop Now</button>
        </div>
        <div className="absolute right-2 bottom-0 w-1/3 h-full flex items-end justify-center">
            {/* Abstract representation of product */}
            <div className="w-20 h-24 bg-gradient-to-t from-gray-800 to-gray-600 rounded-t-xl opacity-80 transform rotate-12 translate-y-2"></div>
        </div>
    </div>
  </div>
);

const CategoryBar = ({ 
  selected, 
  onSelect 
}: { 
  selected: Category; 
  onSelect: (c: Category) => void;
}) => (
  <div className="bg-gray-50/95 sticky top-[132px] z-40 pb-2 backdrop-blur-sm">
    <div className="max-w-md mx-auto overflow-x-auto hide-scrollbar py-2 px-4 flex gap-2.5">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`
            whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all transform active:scale-95
            ${selected === cat 
              ? 'bg-gray-900 text-white shadow-md' 
              : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100'
            }
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  </div>
);

const RewardModal = ({ show, points, onClose }: { show: boolean, points: number, onClose: () => void }) => {
  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center transform scale-100 animate-in zoom-in duration-200 mx-5 relative overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fb923c_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
          
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce shadow-inner relative z-10">
             <div className="absolute inset-0 bg-yellow-400 opacity-20 blur-xl rounded-full animate-pulse"></div>
             <PartyPopper size={48} className="text-orange-600 relative z-20" />
          </div>
          
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 mb-2 animate-pulse">Congratulations!</h2>
          <p className="text-gray-500 mb-2 font-medium">You've hit the jackpot!</p>
          <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-100">
             <p className="text-sm text-gray-600 mb-1">You earned</p>
             <p className="font-extrabold text-orange-600 text-3xl">+{points} Coins</p>
          </div>
          
          <button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-200 transform active:scale-95"
          >
              Awesome!
          </button>
        </div>
      </div>
      <Confetti />
    </>
  );
};

// ... [RewardsPage, SpinWheelGame, VariantSelector, QuickViewModal, ProductCard, EmptyState remain same] ...

const VariantSelector = ({ 
  groups, 
  selected, 
  onSelect 
}: { 
  groups: VariantGroup[], 
  selected: Record<string, string>, 
  onSelect: (groupId: string, optionId: string) => void 
}) => {
  return (
    <div className="space-y-3 mb-4">
      {groups.map(group => (
        <div key={group.id}>
          <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase">{group.name}: <span className="text-gray-900">{group.options.find(o => o.id === selected[group.id])?.label}</span></p>
          <div className="flex flex-wrap gap-2">
            {group.options.map(option => {
              const isSelected = selected[group.id] === option.id;
              
              if (group.type === 'color') {
                return (
                  <button
                    key={option.id}
                    onClick={(e) => { e.stopPropagation(); onSelect(group.id, option.id); }}
                    className={`w-8 h-8 rounded-full border-2 transition-all relative ${isSelected ? 'border-orange-500 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: option.colorCode || '#ddd' }}
                    title={option.label}
                  >
                     {isSelected && <CheckCircle2 size={12} className="text-white absolute inset-0 m-auto drop-shadow-md" />}
                  </button>
                );
              }

              return (
                <button
                  key={option.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(group.id, option.id); }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${isSelected ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const QuickViewModal = ({ 
  product, 
  isOpen, 
  onClose, 
  onBuy,
  isProcessing,
  isWishlisted,
  onToggleWishlist
}: { 
  product: Product | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onBuy: (p: Product) => void; 
  isProcessing: boolean;
  isWishlisted: boolean;
  onToggleWishlist: (id: number) => void;
}) => {
  const { selectedVariants, selectVariant, currentPrice, currentImage } = useVariantSelection(product);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300 ease-out" 
        onClick={!isProcessing ? onClose : undefined}
      />
      
      <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl pointer-events-auto transform transition-all animate-in slide-in-from-bottom-8 zoom-in-95 fade-in duration-300 ease-out max-h-[90vh] flex flex-col mx-auto sm:mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <span className="font-bold text-gray-800 text-lg tracking-tight">Quick View</span>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 flex-1 hide-scrollbar">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-center sm:w-1/2 aspect-square sm:aspect-auto relative group">
               <SmartImage 
                 term={product.title} 
                 fallbackSrc={currentImage} 
                 alt={product.title} 
                 className="w-full h-full object-contain mix-blend-multiply transition-all duration-500 hover:scale-110" 
               />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                 <SourceBadge source={product.source} />
                 <div className="flex items-center gap-1 bg-yellow-400/10 px-2.5 py-1 rounded-full border border-yellow-400/20">
                    <Star size={14} className="text-yellow-500" fill="currentColor" />
                    <span className="text-xs font-bold text-gray-800">{product.rating}</span>
                 </div>
              </div>

              <h3 className="font-bold text-gray-900 text-xl leading-snug mb-3 font-display">
                {product.title}
              </h3>

              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">₹{currentPrice.toLocaleString()}</span>
                {product.originalPrice > currentPrice && (
                  <>
                    <span className="text-sm text-gray-400 line-through decoration-gray-300">₹{product.originalPrice.toLocaleString()}</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                      {Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {product.variantGroups && (
                  <VariantSelector 
                    groups={product.variantGroups} 
                    selected={selectedVariants} 
                    onSelect={selectVariant} 
                  />
              )}

              {product.isWholesale && (
                <div className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-800 text-xs font-medium flex items-center gap-2">
                  <Factory size={16} />
                  Min Order Qty: {product.minOrderQty} Units
                </div>
              )}

              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {product.description}
              </p>

              <div className="space-y-3 mb-6">
                <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide opacity-80">Highlights</h4>
                <ul className="grid grid-cols-1 gap-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-[32px] flex gap-3">
          <button 
            onClick={() => onToggleWishlist(product.id)}
            disabled={isProcessing}
            className="p-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-red-500 transition-colors active:scale-95"
          >
             <Heart size={24} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
          </button>
          
          <button 
            onClick={() => onBuy(product)}
            disabled={isProcessing}
            className={`flex-1 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-200 transform active:scale-[0.98] ${isProcessing ? 'opacity-75 cursor-wait' : ''}`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{product.isWholesale ? 'Get Quote on IndiaMart' : `Buy Now at ${product.source}`}</span>
                <ExternalLink size={20} />
              </>
            )}
          </button>
        </div>
        {!product.isWholesale && (
            <p className="text-center text-xs text-orange-600 mb-4 font-bold flex items-center justify-center gap-1.5 opacity-90">
              <Coins size={14} fill="currentColor" />
              Earn 10 Coins with this purchase
            </p>
          )}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ 
  product: Product; 
  onBuy: (p: Product) => void;
  onQuickView: (p: Product) => void;
  isProcessing: boolean;
  isWishlisted: boolean;
  onToggleWishlist: (id: number) => void;
}> = ({ 
  product, 
  onBuy,
  onQuickView,
  isProcessing,
  isWishlisted,
  onToggleWishlist
}) => {
  const { selectedVariants, selectVariant, currentPrice, currentImage } = useVariantSelection(product);

  return (
  <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col h-full transition-all duration-300 group relative">
    <div className="relative h-44 bg-gray-50 overflow-hidden">
      <SmartImage 
         term={product.title} 
         fallbackSrc={currentImage} 
         alt={product.title} 
         className="w-full h-full object-contain p-4 mix-blend-multiply cursor-pointer transition-transform duration-500 group-hover:scale-105"
         onClick={() => onQuickView(product)}
      />
      
      <div className="absolute top-3 left-3">
        <SourceBadge source={product.source} />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleWishlist(product.id);
        }}
        className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-gray-500 hover:text-red-500 hover:bg-white hover:scale-110 transition-all active:scale-95 z-10"
        title="Add to Wishlist"
      >
        <Heart size={18} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
      </button>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onQuickView(product);
        }}
        className="absolute top-12 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-gray-500 hover:text-orange-500 hover:bg-white hover:scale-110 transition-all active:scale-95 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300 z-10"
        title="Quick View"
      >
        <Eye size={18} />
      </button>

      {product.isWholesale && (
        <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-[10px] font-bold text-center py-1 backdrop-blur-sm">
            WHOLESALE
        </div>
      )}
    </div>
    
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex items-center gap-1 mb-1.5">
        <Star size={12} className="text-yellow-400" fill="currentColor" />
        <span className="text-xs font-bold text-gray-700">{product.rating}</span>
        <span className="text-[10px] text-gray-400 mx-1">•</span>
        <span className="text-[10px] text-gray-400 truncate">{product.category}</span>
      </div>
      
      <h3 
        className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight mb-2.5 flex-1 cursor-pointer hover:text-orange-600 transition-colors"
        onClick={() => onQuickView(product)}
      >
        {product.title}
      </h3>

      {/* Mini Variant Selectors for Product Card */}
      {product.variantGroups && (
         <div className="flex flex-wrap gap-1.5 mb-2">
           {product.variantGroups.slice(0, 1).map(group => ( // Only show first group on card to avoid clutter
              group.type === 'color' ? (
                group.options.map(opt => (
                  <button 
                    key={opt.id}
                    onClick={(e) => { e.stopPropagation(); selectVariant(group.id, opt.id); }}
                    className={`w-4 h-4 rounded-full border ${selectedVariants[group.id] === opt.id ? 'border-orange-500 scale-110 ring-1 ring-orange-200' : 'border-gray-200'}`}
                    style={{ backgroundColor: opt.colorCode || '#ddd' }}
                    title={opt.label}
                  />
                ))
              ) : (
                group.options.map(opt => (
                   <button 
                    key={opt.id}
                    onClick={(e) => { e.stopPropagation(); selectVariant(group.id, opt.id); }}
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${selectedVariants[group.id] === opt.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))
              )
           ))}
           {product.variantGroups.length > 1 && <span className="text-[9px] text-gray-400 self-center">+More</span>}
         </div>
      )}
      
      <div className="mt-auto pt-2 border-t border-gray-50">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900">₹{currentPrice.toLocaleString()}</span>
          {product.originalPrice > currentPrice && (
            <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString()}</span>
          )}
        </div>
        
        <button 
          onClick={() => onBuy(product)}
          disabled={isProcessing}
          className={`w-full ${product.isWholesale ? 'bg-slate-800 hover:bg-slate-900' : 'bg-orange-500 hover:bg-orange-600'} active:opacity-90 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-md shadow-gray-200 transform active:scale-95 ${isProcessing ? 'opacity-75 cursor-wait' : ''}`}
        >
          {isProcessing ? (
             <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processing...</span>
             </>
          ) : (
             <>
                <span>{product.isWholesale ? 'Get Quote' : 'Buy Now'}</span>
                {product.isWholesale ? <Factory size={14} /> : <ExternalLink size={14} />}
             </>
          )}
        </button>
        {!product.isWholesale && (
            <p className="text-[10px] text-center text-orange-500 font-medium mt-1.5 flex items-center justify-center gap-1">
            +10 Coins Reward
            </p>
        )}
      </div>
    </div>
  </div>
  );
};

const EmptyState = ({ title, sub }: { title: string, sub: string }) => (
    <div className="text-center py-20 px-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
            {title.includes("Wishlist") ? (
                <Heart size={40} className="text-gray-400" />
            ) : (
                <ShoppingBag size={40} className="text-gray-400" />
            )}
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">{sub}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-orange-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-orange-200">Start Shopping</button>
    </div>
);

// ... [RewardsPage, SpinWheelGame remain same] ...
const RewardsPage = ({ coins }: { coins: number }) => {
  const TARGET = 50000;
  const needed = Math.max(0, TARGET - coins);
  const progress = Math.min(100, (coins / TARGET) * 100);

  const redeemOptions = [
    { title: "₹500 Amazon Voucher", cost: 50000, icon: Gift },
    { title: "₹1000 Flipkart Voucher", cost: 100000, icon: ShoppingBag },
    { title: "Premium Headphones", cost: 250000, icon: Headphones },
  ];

  return (
    <div className="p-4 animate-in slide-in-from-right duration-500">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-5"></div>
        
        <div className="relative z-10 text-center">
            <p className="text-orange-100 text-sm font-medium mb-1">Total Balance</p>
            <div className="flex items-center justify-center gap-2 mb-4">
                <Coins size={32} className="text-yellow-300" fill="currentColor" />
                <h2 className="text-5xl font-extrabold tracking-tight">{coins.toLocaleString()}</h2>
            </div>
            
            {/* Progress to next goal */}
            <div className="bg-black/20 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <div className="flex justify-between text-xs font-bold mb-2 opacity-90">
                    <span>Progress to ₹500 Voucher</span>
                    <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-black/30 rounded-full overflow-hidden mb-2">
                    <div 
                        className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-orange-100 font-medium">
                    Collect <span className="text-white font-bold">{needed.toLocaleString()}</span> more coins to claim!
                </p>
            </div>
        </div>
      </div>

      {/* Rewards List */}
      <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
          <Gift size={20} className="text-orange-500" />
          Redeem Options
      </h3>
      
      <div className="space-y-4">
        {redeemOptions.map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                        <item.icon size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">{item.title}</h4>
                        <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                            <Coins size={12} fill="currentColor" />
                            {item.cost.toLocaleString()} Coins
                        </p>
                    </div>
                </div>
                
                <button 
                    disabled={coins < item.cost}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        coins >= item.cost 
                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {coins >= item.cost ? 'Redeem' : (
                        <>
                            <Lock size={12} />
                            <span>Locked</span>
                        </>
                    )}
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};

const SpinWheelGame = ({ 
  userCoins, 
  setUserCoins, 
  spinsLeft, 
  setSpinsLeft 
}: { 
  userCoins: number, 
  setUserCoins: React.Dispatch<React.SetStateAction<number>>,
  spinsLeft: number,
  setSpinsLeft: React.Dispatch<React.SetStateAction<number>>
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winModalOpen, setWinModalOpen] = useState(false);
  const [winAmount, setWinAmount] = useState(0);

  const segments = [
    { label: '5', color: '#3b82f6', value: 5 },
    { label: '10', color: '#ef4444', value: 10 },
    { label: '20', color: '#fbbf24', value: 20 },
    { label: '50', color: '#10b981', value: 50 },
    { label: '0', color: '#6b7280', value: 0 },
    { label: '100', color: '#8b5cf6', value: 100 },
  ];
  
  const handleSpin = () => {
    if (isSpinning || spinsLeft <= 0) return;

    setIsSpinning(true);
    setSpinsLeft(prev => prev - 1);

    const randomSegmentIndex = Math.floor(Math.random() * segments.length);
    const win = segments[randomSegmentIndex].value;
    
    const extraSpins = 5 + Math.floor(Math.random() * 5);
    const segmentAngle = 360 / segments.length;
    const targetAngle = (360 - (randomSegmentIndex * segmentAngle) - (segmentAngle/2)); 
    const totalRotation = rotation + (360 * extraSpins) + (targetAngle - (rotation % 360));

    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinAmount(win);
      if (win > 0) {
        setUserCoins(prev => prev + win);
      }
      setWinModalOpen(true);
    }, 5000);
  };

  return (
    <div className="p-4 flex flex-col items-center animate-in slide-in-from-right duration-500">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 w-full mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Daily Spin</h2>
        <p className="text-gray-500 text-sm mb-6">Spin the wheel to win exciting rewards!</p>
        
        <div className="relative w-64 h-64 mx-auto mb-8">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-orange-600 drop-shadow-md"></div>
            
            <div 
                className="w-full h-full rounded-full border-4 border-white shadow-[0_0_20px_rgba(0,0,0,0.1)] relative overflow-hidden transition-transform duration-[5000ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
                style={{ 
                    transform: `rotate(${rotation}deg)`,
                    background: `conic-gradient(
                        ${segments[0].color} 0deg 60deg,
                        ${segments[1].color} 60deg 120deg,
                        ${segments[2].color} 120deg 180deg,
                        ${segments[3].color} 180deg 240deg,
                        ${segments[4].color} 240deg 300deg,
                        ${segments[5].color} 300deg 360deg
                    )`
                }}
            >
                {segments.map((seg, i) => (
                    <div 
                        key={i}
                        className="absolute w-full h-full text-white font-bold text-lg flex justify-center pt-4"
                        style={{ 
                            transform: `rotate(${i * 60 + 30}deg)`,
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}
                    >
                        {seg.label}
                    </div>
                ))}
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center z-10 border-4 border-gray-100">
                <Gift className="text-orange-500" size={24} />
            </div>
        </div>

        <div className="space-y-4">
             <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 py-2 px-4 rounded-full mx-auto w-max">
                <Trophy size={16} className="text-yellow-500" />
                <span>Spins Left: {spinsLeft}/3</span>
             </div>

            <button 
                onClick={handleSpin}
                disabled={isSpinning || spinsLeft <= 0}
                className={`w-full max-w-xs mx-auto py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                    ${isSpinning || spinsLeft <= 0 
                        ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-orange-200'
                    }`}
            >
                {isSpinning ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Spinning...
                    </>
                ) : spinsLeft <= 0 ? (
                    'Come Back Tomorrow'
                ) : (
                    'SPIN NOW'
                )}
            </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full flex items-start gap-3">
          <Zap className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div>
              <h3 className="font-bold text-blue-900 text-sm mb-1">How it works</h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                  You get 3 free spins every day. Rewards are added to your wallet instantly. 
                  Use coins to get discounts on your favorite products!
              </p>
          </div>
      </div>

      <RewardModal 
        show={winModalOpen} 
        points={winAmount} 
        onClose={() => setWinModalOpen(false)} 
      />
    </div>
  );
};


const App = () => {
  const [coins, setCoins] = useState(150);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [showReward, setShowReward] = useState(false);
  const [rewardProduct, setRewardProduct] = useState<Product | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [wishlist, setWishlist] = useState<number[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sources: [],
    priceRange: { min: '', max: '' },
    minRating: 0,
    sortBy: 'relevance'
  });

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.sources.length > 0) count++;
    if (filters.priceRange.min !== '' || filters.priceRange.max !== '') count++;
    if (filters.minRating > 0) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (id: number) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    let products = currentPage === 'wholesale' ? WHOLESALE_PRODUCTS : RETAIL_PRODUCTS;
    
    // Page Level Filtering
    if (currentPage === 'wishlist') {
       const all = [...RETAIL_PRODUCTS, ...WHOLESALE_PRODUCTS];
       products = all.filter(p => wishlist.includes(p.id));
    } else if (currentPage !== 'home' && currentPage !== 'wholesale') {
       // Other pages like 'game' don't show products list
       return [];
    }

    // Apply Filters
    return products.filter(p => {
      // Search
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Category
      if (currentPage !== 'wishlist' && selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      
      // Source / Brand
      if (filters.sources.length > 0 && !filters.sources.includes(p.source)) return false;
      
      // Price Range
      const minPrice = filters.priceRange.min === '' ? 0 : filters.priceRange.min;
      const maxPrice = filters.priceRange.max === '' ? Infinity : filters.priceRange.max;
      if (p.price < minPrice || p.price > maxPrice) return false;
      
      // Rating
      if (p.rating < filters.minRating) return false;
      
      return true;
    }).sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_low': return a.price - b.price;
        case 'price_high': return b.price - a.price;
        case 'rating': return b.rating - a.rating;
        default: return 0; // relevance implies default order
      }
    });
  }, [currentPage, selectedCategory, filters, wishlist, searchQuery]);

  const handleBuy = (product: Product) => {
    if (processingId) return;
    setProcessingId(product.id);

    setTimeout(() => {
        setProcessingId(null);
        setQuickViewProduct(null);

        if(product.isWholesale) {
           window.open(product.url, '_blank');
           return;
        }

        setRewardProduct(product);
        setShowReward(true);
        setCoins(prev => prev + 10);
        
        setTimeout(() => {
          window.open(product.url, '_blank');
          setShowReward(false);
          setRewardProduct(null);
        }, 3500);
    }, 1000);
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const resetFilters = () => {
    setFilters({
      sources: [],
      priceRange: { min: '', max: '' },
      minRating: 0,
      sortBy: 'relevance'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24 font-sans selection:bg-orange-100">
      <Header 
        coins={coins} 
        currentPage={currentPage} 
        onFilterClick={() => setIsFilterOpen(true)}
        activeFiltersCount={activeFiltersCount}
        onMenuClick={() => setIsSidebarOpen(true)}
        setSearchQuery={setSearchQuery}
      />
      
      <div className={`transition-all duration-300 ${['game', 'orders', 'rewards', 'wishlist'].includes(currentPage) ? 'h-20' : 'h-[132px]'}`} />
      
      {(currentPage === 'home' || currentPage === 'wholesale') && (
        <>
            <CategoryBar 
                selected={selectedCategory} 
                onSelect={setSelectedCategory} 
            />
            <ActiveFilters 
                filters={filters} 
                setFilters={setFilters} 
                onReset={resetFilters} 
            />
            {currentPage === 'home' && selectedCategory === 'All' && !activeFiltersCount && !searchQuery && <BannerSlider />}
        </>
      )}

      <main className="max-w-md mx-auto p-4">
        {(currentPage === 'home' || currentPage === 'wholesale' || currentPage === 'wishlist') && (
            isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredProducts.map(product => (
                <ProductCard 
                    key={product.id} 
                    product={product} 
                    onBuy={handleBuy} 
                    onQuickView={handleQuickView}
                    isProcessing={processingId === product.id}
                    isWishlisted={wishlist.includes(product.id)}
                    onToggleWishlist={toggleWishlist}
                />
                ))}
            </div>
            ) : (
            currentPage === 'wishlist' ? (
                <EmptyState title="Your Wishlist is Empty" sub="Start saving your favorite items now!" />
            ) : (
                <div className="text-center py-16 text-gray-400">
                    <Search size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No products match your criteria.</p>
                    <button onClick={() => {resetFilters(); setSearchQuery(""); }} className="mt-4 text-orange-500 text-sm font-bold hover:underline">Clear Filters</button>
                </div>
            )
            )
        )}

        {currentPage === 'game' && (
            <SpinWheelGame 
                userCoins={coins} 
                setUserCoins={setCoins}
                spinsLeft={spinsLeft}
                setSpinsLeft={setSpinsLeft}
            />
        )}
        
        {currentPage === 'orders' && <EmptyState title="No active orders" sub="Looks like you haven't bought anything yet." />}

        {currentPage === 'rewards' && <RewardsPage coins={coins} />}

      </main>

      <RewardModal show={showReward} points={10} onClose={() => setShowReward(false)} />
      
      <QuickViewModal 
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onBuy={handleBuy}
        isProcessing={processingId === quickViewProduct?.id}
        isWishlisted={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
        onToggleWishlist={toggleWishlist}
      />

      <FilterModal 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onReset={resetFilters}
      />

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onSelectCategory={(c) => { 
          setCurrentPage('home'); 
          setSelectedCategory(c); 
        }}
        selectedCategory={selectedCategory}
        onSelectWholesale={() => {
           setCurrentPage('wholesale');
           setSelectedCategory('All');
        }}
      />

      <nav className="fixed bottom-4 left-4 right-4 z-50">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl h-[72px] flex justify-around items-center px-1">
            
          <button 
            onClick={() => { setCurrentPage('home'); setSelectedCategory('All'); resetFilters(); setSearchQuery(""); }}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${currentPage === 'home' ? 'text-orange-500 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${currentPage === 'home' ? 'bg-orange-50 shadow-orange-100' : 'bg-transparent group-hover:bg-gray-50'}`}>
                <Home size={20} fill={currentPage === 'home' ? "currentColor" : "none"} strokeWidth={currentPage === 'home' ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold mt-0.5 transition-opacity ${currentPage === 'home' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Home</span>
          </button>

          <button 
            onClick={() => { setCurrentPage('wholesale'); setSelectedCategory('All'); resetFilters(); setSearchQuery(""); }}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${currentPage === 'wholesale' ? 'text-blue-600 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
          >
             <div className={`p-2 rounded-2xl transition-all duration-300 ${currentPage === 'wholesale' ? 'bg-blue-50 shadow-blue-100' : 'bg-transparent group-hover:bg-gray-50'}`}>
                <Factory size={20} strokeWidth={currentPage === 'wholesale' ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold mt-0.5 transition-opacity ${currentPage === 'wholesale' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Wholesale</span>
          </button>

          <button 
            onClick={() => { setCurrentPage('wishlist'); }}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${currentPage === 'wishlist' ? 'text-red-500 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
          >
             <div className={`p-2 rounded-2xl transition-all duration-300 ${currentPage === 'wishlist' ? 'bg-red-50 shadow-red-100' : 'bg-transparent group-hover:bg-gray-50'}`}>
                <Heart size={20} fill={currentPage === 'wishlist' ? "currentColor" : "none"} strokeWidth={currentPage === 'wishlist' ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold mt-0.5 transition-opacity ${currentPage === 'wishlist' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Wishlist</span>
          </button>

          <button 
            onClick={() => setCurrentPage('rewards')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${currentPage === 'rewards' ? 'text-yellow-500 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
          >
             <div className={`p-2 rounded-2xl transition-all duration-300 ${currentPage === 'rewards' ? 'bg-yellow-50 shadow-yellow-100' : 'bg-transparent group-hover:bg-gray-50'}`}>
                <Coins size={20} fill={currentPage === 'rewards' ? "currentColor" : "none"} strokeWidth={currentPage === 'rewards' ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold mt-0.5 transition-opacity ${currentPage === 'rewards' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Rewards</span>
          </button>

          <button 
            onClick={() => setCurrentPage('game')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${currentPage === 'game' ? 'text-purple-600 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
          >
             <div className={`p-2 rounded-2xl transition-all duration-300 ${currentPage === 'game' ? 'bg-purple-50 shadow-purple-100' : 'bg-transparent group-hover:bg-gray-50'}`}>
                <Gamepad2 size={20} strokeWidth={currentPage === 'game' ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold mt-0.5 transition-opacity ${currentPage === 'game' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Game</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);