'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, FileSearch, BellRing, MessageSquare, LogIn, LayoutGrid, User } from 'lucide-react';
import { getOrdersByIds, getOrdersByUser } from '@/lib/admin-actions';
import type { Order } from '@/lib/types';
import { Header } from '@/components/header';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { useLanguage } from '@/context/language-context';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import config from '@/lib/config.json';
import { useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';

export default function TrackOrderPage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const [foundOrders, setFoundOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let orders: Order[] = [];
      
      // 1. If user is logged in, fetch their orders from Firestore
      if (user) {
        orders = await getOrdersByUser(user.uid);
      }
      
      // 2. Also check localStorage for anonymous orders placed on this device
      const storedIds = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('myOrderIds') || '[]') : [];
      if (storedIds.length > 0) {
        const localOrders = await getOrdersByIds(storedIds);
        // Merge and remove duplicates by ID
        const allOrders = [...orders, ...localOrders];
        orders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
      }

      // 3. Check for specific orderId in URL query parameter (for QR code/tracking links)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlOrderId = urlParams.get('orderId');
        if (urlOrderId) {
          const qrOrder = await getOrdersByIds([urlOrderId]);
          if (qrOrder.length > 0) {
            const allOrders = [...qrOrder, ...orders];
            orders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
            
            // Also store it locally so they don't lose it from their device
            const storedIdsList = JSON.parse(localStorage.getItem('myOrderIds') || '[]');
            if (!storedIdsList.includes(urlOrderId)) {
              storedIdsList.push(urlOrderId);
              localStorage.setItem('myOrderIds', JSON.stringify(storedIdsList));
            }
          } else {
            toast({
              variant: 'destructive',
              title: language === 'ur' ? 'آرڈر نہیں ملا' : 'Order Not Found',
              description: language === 'ur' 
                ? `آئی ڈی ${urlOrderId} والا آرڈر تلاش نہیں کیا جا سکا۔` 
                : `Order with ID ${urlOrderId} could not be found.`,
            });
          }
        }
      }

      // Sort by date newest first
      setFoundOrders(orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error loading order history", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!userLoading) {
      fetchOrders();
    }
  }, [user, userLoading]);

  const handleGoogleLogin = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Error", description: "Auth system not ready." });
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      toast({ title: "Connecting to Google..." });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Popup login failed, trying redirect...", error);
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError: any) {
        console.error("Login Error:", redirectError);
        let msg = redirectError.message;
        if (redirectError.code === 'auth/unauthorized-domain') {
          msg = "This domain is not authorized for login. Please add it in Firebase Console.";
        }
        toast({ variant: "destructive", title: "Login Failed", description: msg });
      }
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setFoundOrders([]);
    fetchOrders(); // Reload to show local only
  };

  const getBadgeVariant = (status: Order['status']) => {
    switch (status) {
      case 'Delivered': return 'default';
      case 'Shipped': return 'secondary';
      case 'In Progress': return 'outline';
      case 'Pending': return 'outline';
      case 'Canceled': return 'destructive';
      default: return 'default';
    }
  };

  const handleSendReminder = (order: Order) => {
    const businessPhone = config.businessWhatsAppNumber;
    if (!businessPhone) {
      toast({ variant: 'destructive', title: 'Contact Number Missing', description: 'Admin WhatsApp number is not configured.' });
      return;
    }

    const message = language === 'ur' 
      ? `*السلام علیکم!*\n\nمیں اپنے آرڈر کے بارے میں یاد دہانی (Reminder) بھیجنا چاہتا ہوں۔\n\n*آرڈر آئی ڈی:* ${order.id}\n*نام:* ${order.customerName}\n*ٹوٹل رقم:* PKR ${order.totalPrice.toLocaleString()}\n\nبراہ کرم اس آرڈر کی اپڈیٹ فراہم کریں۔ شکریہ!`
      : `*Asalam-o-Alaikum!*\n\nI want to send a reminder for my order.\n\n*Order ID:* ${order.id}\n*Customer:* ${order.customerName}\n*Total Amount:* PKR ${order.totalPrice.toLocaleString()}\n\nKindly provide an update. Thank you!`;

    const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-muted/20 mt-16 md:mt-28">
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6 text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {language === 'ur' ? 'آپ کے آرڈرز' : 'Your Orders'}
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-xl">
              {language === 'ur' 
                ? 'اپنے آرڈرز کو کسی بھی ڈیوائس پر دیکھنے کے لیے لاگ ان کریں۔' 
                : 'Login to see your orders on any device.'}
            </p>
            
            <div className="mt-8 flex justify-center gap-4">
              {!user ? (
                <Button onClick={handleGoogleLogin} className="bg-white text-black hover:bg-gray-100 border shadow-sm h-12 px-6 rounded-full font-bold">
                  <svg className="h-5 w-5 mr-2 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.84 14.97 1 12 1 7.35 1 3.4 3.65 1.49 7.55l3.7 2.87C6.1 7.5 8.85 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.33H12v4.51h6.43a5.5 5.5 0 01-2.37 3.64l3.69 2.86c2.16-1.99 3.74-4.91 3.74-8.68z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.19 14.73a7.12 7.12 0 010-4.46L1.49 7.4a11.97 11.97 0 000 9.2l3.7-2.87z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 18.96c-3.15 0-5.9-2.46-6.81-5.38L1.49 16.45C3.4 20.35 7.35 23 12 23c2.97 0 5.46-.98 7.28-2.66l-3.69-2.86c-1 .67-2.28 1.48-3.59 1.48z"
                    />
                  </svg>
                  {language === 'ur' ? 'گوگل کے ساتھ لاگ ان کریں' : 'Login with Google'}
                </Button>
              ) : (
                <div className="flex items-center gap-4 bg-background p-2 pr-4 rounded-full border shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                      {user.photoURL ? (
                        <Image src={user.photoURL} alt="User" width={32} height={32} />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-semibold">{user.displayName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs h-8">Logout</Button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="w-full pb-12 md:pb-24 lg:pb-32">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : foundOrders.length > 0 ? (
                foundOrders.map(order => (
                  <Card key={order.id} className="overflow-hidden border-l-4 border-l-primary shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">Order #{order.id}</CardTitle>
                          <CardDescription>
                            Placed on {new Date(order.date).toLocaleDateString('en-GB')}
                          </CardDescription>
                        </div>
                        <Badge variant={getBadgeVariant(order.status)} className="text-sm px-3 py-1">
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4 border border-primary/10">
                        <div>
                          <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Total Amount</p>
                          <p className="text-2xl font-bold text-primary">
                            PKR {order.totalPrice.toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          onClick={() => handleSendReminder(order)}
                          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        >
                          <BellRing className="mr-2 h-4 w-4" />
                          {language === 'ur' ? 'یاد دہانی بھیجیں' : 'Send Reminder'}
                        </Button>
                      </div>

                      {order.calculationDetails && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            {language === 'ur' ? 'آرڈر میں شامل آئٹمز:' : 'Items in this Order:'}
                          </h4>
                          <div className="grid gap-3">
                            {order.calculationDetails.requirements.map((req, idx) => {
                              const imageUrl = req.marble?.imageUrl || req.fixingMaterial?.imageUrl;
                              const altText = req.marble?.name || req.fixingMaterial?.name || 'Order item';

                              return (
                                <div key={`${order.id}-req-${idx}`} className="flex items-center gap-4 rounded-md border p-3 bg-background hover:shadow-sm transition-shadow">
                                  {imageUrl ? (
                                    <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                                      <Image src={imageUrl} alt={altText} fill className="object-cover" />
                                    </div>
                                  ) : (
                                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                                      <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className="font-bold leading-tight">{req.name}</p>
                                    {req.marble && req.name !== req.marble.name && (
                                      <p className="text-xs text-muted-foreground">{req.marble.name}</p>
                                    )}
                                  </div>
                                  <p className="font-bold text-primary">
                                    PKR {req.total.toLocaleString()}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="text-center py-12 border-dashed">
                  <CardHeader>
                    <div className="mx-auto bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                      <FileSearch className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle>{language === 'ur' ? 'کوئی آرڈر نہیں ملا' : 'No Orders Found'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {language === 'ur' 
                        ? 'آپ نے ابھی تک کوئی آرڈر نہیں دیا ہے۔ اگر آپ نے پہلے آرڈر دیا تھا، تو اسے سنک کرنے کے لیے لاگ ان کریں۔' 
                        : 'No orders have been placed yet. If you ordered before, login to sync your history.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex w-full shrink-0 flex-col sm:flex-row items-center justify-between gap-4 border-t px-4 py-6 md:px-8 bg-muted/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 relative flex items-center justify-center rounded-full overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
            <Icons.logo alt="Stone Expert Logo" className="object-contain h-full w-full p-0.5" />
          </div>
          <span className="font-headline text-lg font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
        </Link>
        <p className="text-xs text-foreground/70">{t('footer_text')}</p>
      </footer>
    </div>
  );
}
