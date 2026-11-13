
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { PreviewDialog } from '@/components/preview-dialog';
import { QrDialog } from '@/components/qr-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order, CalculationDetails, MarbleVariant, Requirement } from '@/lib/types';
import config from '@/lib/config.json';
import costs from '@/lib/costs.json';
import { getOrders, deleteOrder, updateOrderStatus, getHomepageConfig } from '@/lib/admin-actions';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, Share2, CheckCircle2, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [letterheadUrl, setLetterheadUrl] = useState(config.letterheadUrl);
  const { toast } = useToast();
  const router = useRouter();
  
  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // QR Code Dialog State
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedQrOrder, setSelectedQrOrder] = useState<Order | null>(null);

  const handleQrClick = (order: Order) => {
    setSelectedQrOrder(order);
    setIsQrOpen(true);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      const [fetchedOrders, homepageConfig] = await Promise.all([
        getOrders(),
        getHomepageConfig()
      ]);
      setOrders(fetchedOrders as Order[]);
      setIsLoading(false);
      if (homepageConfig && homepageConfig.letterheadUrl) {
        setLetterheadUrl(homepageConfig.letterheadUrl);
      } else {
        setLetterheadUrl(config.letterheadUrl);
      }
    };
    fetchOrders();
  }, []);

  const getBadgeVariant = (status: Order['status']): "default" | "secondary" | "destructive" | "outline" | null | undefined => {
    switch (status) {
      case 'Delivered':
        return 'default';
      case 'Shipped':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Pending':
        return 'outline';
      case 'Canceled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handlePreviewClick = (order: Order) => {
    setSelectedOrder(order);
    setIsPreviewOpen(true);
  };
  
  const handleEditClick = (order: Order) => {
    if (!order.calculationDetails || !order.calculationDetails.marble) {
      toast({
        variant: 'destructive',
        title: 'Cannot Edit Order',
        description: 'This order does not have the necessary details to be edited.',
      });
      return;
    }
    // Navigate to the order page with the orderId as a query param
    router.push(`/order/${order.calculationDetails.marble.id}?orderId=${order.id}`);
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    const result = await deleteOrder(orderToDelete.id);

    if (result.success) {
      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderToDelete.id));
      toast({
        title: 'Order Deleted',
        description: `Order #${orderToDelete.id} has been successfully deleted.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    const originalOrders = [...orders];
    
    // Optimistically update UI
    setOrders(prevOrders =>
      prevOrders.map(o => (o.id === orderId ? { ...o, status } : o))
    );

    const result = await updateOrderStatus(orderId, status);

    if (!result.success) {
      // Revert on failure
      setOrders(originalOrders);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: result.error,
      });
    } else {
      toast({
        title: 'Status Updated',
        description: `Order #${orderId} is now ${status}.`,
      });
    }
  };
  
  const getPrintData = (order: Order | null) => {
    if (!order || !order.calculationDetails) {
      return { 
        letterheadUrl, 
        details: order?.id || '',
        name: order?.customerName || '',
        phone: '',
        address: '',
        loadLocation: '',
        loadSize: '',
        date: order?.date || '',
        total: order?.totalPrice || 0,
        subTotal: 0,
        deliveryCost: 0,
        requirements: [] as Requirement[],
      };
    }

    const details = order.calculationDetails;
    const requirements: Requirement[] = details.requirements || [];

    const itemsTotal = requirements.reduce((acc, req) => acc + (req.total || 0), 0);
    const subTotal = itemsTotal; // Subtotal is just items total before delivery
    const deliveryCost = order.totalPrice > subTotal ? order.totalPrice - subTotal : 0;

    return {
        letterheadUrl: letterheadUrl,
        name: details.customerInfo?.name || order.customerName,
        phone: details.customerInfo?.phone || 'N/A',
        address: details.customerInfo?.address || 'N/A',
        loadLocation: details.customerInfo?.loadLocation || '',
        loadSize: details.customerInfo?.loadSize || '',
        details: order.id,
        date: order.date,

        total: order.totalPrice,
        subTotal,
        deliveryCost,
        requirements,
    };
  }

  const handleShare = (order: Order) => {
      const data = getPrintData(order);
      if (!data.name || !data.phone) {
          toast({ variant: 'destructive', title: "Cannot Share", description: "Order data is incomplete."});
          return;
      }
      
      let message = '';
      if (data.requirements) {
           const itemsSummary = data.requirements.map(r => `* ${r.name}: PKR ${r.total.toLocaleString()}`).join('\n');
           message = `*السلام علیکم!*\n\n*کوٹیشن برائے ${data.name}*\n\n*آرڈر آئی ڈی:* ${data.details}\n\n*آئٹمز:*\n${itemsSummary}\n\n*سب ٹوٹل:* PKR ${data.subTotal.toLocaleString()}\n*ڈیلیوری:* PKR ${data.deliveryCost.toLocaleString()}\n*کل رقم:* PKR ${data.total.toLocaleString()}\n\nسٹون ایکسپرٹ کے ساتھ تعاون کرنے کا شکریہ!\n*سٹون ایکسپرٹ*`;
      } else {
          message = `Hello ${data.name}, here is your order update for Order ID: ${data.details}. Total amount is PKR ${data.total.toLocaleString()}.`;
      }
      
      const cleanPhone = data.phone.replace(/[^0-9]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
  };


  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Orders</CardTitle>
            <CardDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>A list of recent orders from your customers.</span>
              <span className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-full font-mono border border-slate-200 dark:border-slate-700 w-fit">
                Optimized: Showing last 100 orders to conserve read quota
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Details</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                        <TableCell>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.date).toLocaleDateString('en-GB')}
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <Button
                              aria-haspopup="true"
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewClick(order)}
                           >
                             View
                           </Button>
                           <Button
                              aria-haspopup="true"
                              size="sm"
                              variant="outline"
                              onClick={() => handleQrClick(order)}
                              title="View & Print QR Code"
                           >
                             <QrCode className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getBadgeVariant(order.status)}>
                          {order.status === 'Delivered' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        PKR {order.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(order)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <span>Update Status</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuRadioGroup
                                            value={order.status}
                                            onValueChange={(newStatus) => handleUpdateStatus(order.id, newStatus as Order['status'])}
                                        >
                                            <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="In Progress">In Progress</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="Shipped">Shipped</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="Delivered">Delivered</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="Canceled">Canceled</DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={() => handleShare(order)}>
                               <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQrClick(order)}>
                               <QrCode className="mr-2 h-4 w-4" /> Track QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(order)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                 {!isLoading && orders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No orders found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {selectedOrder && (
        <PreviewDialog
          isOpen={isPreviewOpen}
          setIsOpen={setIsPreviewOpen}
          printData={getPrintData(selectedOrder)}
        />
      )}

      <QrDialog
        isOpen={isQrOpen}
        setIsOpen={setIsQrOpen}
        order={selectedQrOrder}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order #{orderToDelete?.id}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
