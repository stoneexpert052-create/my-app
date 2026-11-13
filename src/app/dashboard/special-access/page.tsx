'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import existingOrders from '@/lib/orders-data.json';
import type { Order } from '@/lib/types';

export default function SpecialAccessPage() {
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleFetchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      toast({
        variant: 'destructive',
        title: 'Order ID Required',
        description: 'Please enter an order ID to fetch.',
      });
      return;
    }
    
    setIsLoading(true);

    // Check if the order exists in the local data
    const orderExists = (existingOrders as Order[]).find(order => order.id === orderId);

    if (orderExists) {
        // For now, just navigate to the edit page. In the future, we'll add the permission flow.
        const marbleId = orderExists.calculationDetails?.marble?.id;
        if(marbleId) {
             router.push(`/order/${marbleId}?orderId=${orderId}`);
        } else {
             toast({
                variant: 'destructive',
                title: 'Cannot Edit Order',
                description: 'The order is missing necessary details to be edited.',
            });
            setIsLoading(false);
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'Order Not Found',
            description: `No order found with the ID: ${orderId}`,
        });
        setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Special Access
        </h1>
      </div>

      <div className="flex justify-center items-start pt-16">
        <Card className="w-full max-w-lg">
          <form onSubmit={handleFetchOrder}>
            <CardHeader>
              <CardTitle>Fetch Order for Editing</CardTitle>
              <CardDescription>
                Enter the customer's Order ID to load it for on-site editing. This provides direct access for admins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="order-id">Order ID</Label>
                <Input
                  id="order-id"
                  placeholder="ORD-123456"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fetch & Edit Order
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
