
'use client';

import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuotationPrint } from './quotation-print';
import { ChallanPrint } from './challan-print';
import { ProductionChallanPrint } from './production-challan-print';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ZoomIn, ZoomOut, RotateCw, FileText, FileSpreadsheet, Truck, Loader2, Share2, Copy, ArrowLeft, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Requirement } from '@/lib/types';
import html2canvas from 'html2canvas';
import { Separator } from '@/components/ui/separator';


type PreviewType = 'quotation' | 'challan' | 'production-challan';

interface PreviewDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  printData: any;
}

export function PreviewDialog({
  isOpen,
  setIsOpen,
  printData,
}: PreviewDialogProps) {
  const [zoom, setZoom] = useState(0.8);
  const [activeView, setActiveView] = useState<PreviewType>('quotation');
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!previewContainerRef.current) {
        toast({ variant: "destructive", title: "Error", description: "Preview content not found." });
        return;
    }

    const printPages = previewContainerRef.current.querySelectorAll<HTMLElement>('[data-print-page]');
    if (printPages.length === 0) {
        toast({ variant: "destructive", title: "Nothing to share", description: "No printable pages found." });
        return;
    }

    setIsGenerating(true);
    toast({ title: "Preparing document..." });
    
    const originalBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'white';

    try {
        const files: File[] = [];
        for (let i = 0; i < printPages.length; i++) {
            const element = printPages[i];
            const canvas = await html2canvas(element, {
                scale: 1.5, 
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                files.push(new File([blob], `${activeView}-page-${i + 1}.png`, { type: 'image/png' }));
            }
        }
        
        document.body.style.backgroundColor = originalBodyBg;

        if (files.length === 0) {
            throw new Error("Could not generate image files for sharing.");
        }

        if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
            await navigator.share({
                title: `${activeView.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} for ${printData.name}`,
                text: `Here is the ${activeView.replace('-', ' ')} for order #${printData.details}.`,
                files: files,
            });
        } else {
            toast({
                title: "Sharing not supported",
                description: "Your browser does not support sharing files. The document images will be downloaded instead.",
            });
            files.forEach(file => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(file);
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            });
        }

    } catch (error: any) {
        document.body.style.backgroundColor = originalBodyBg; 
        if (error.name !== 'AbortError') {
             toast({
                variant: "destructive",
                title: "Sharing Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    } finally {
        setIsGenerating(false);
    }
  };
  
    const handleCopy = async () => {
    if (!previewContainerRef.current) {
      toast({ variant: "destructive", title: "Error", description: "Preview content not found." });
      return;
    }
    
    // Find the first printable page in the container
    const firstPage = previewContainerRef.current.querySelector<HTMLElement>('[data-print-page]');

    if (!firstPage) {
      toast({ variant: "destructive", title: "Nothing to copy", description: "No printable page found." });
      return;
    }

    setIsCopying(true);
    toast({ title: "Generating image to copy..." });

    try {
      const canvas = await html2canvas(firstPage, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Failed to create image blob.");
        }
        
        if (typeof navigator.clipboard.write === 'function') {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            
            const pageCount = previewContainerRef.current!.querySelectorAll('[data-print-page]').length;
            toast({
              title: "Copied to clipboard!",
              description: pageCount > 1 ? "First page has been copied as an image." : "The document has been copied as an image."
            });
        } else {
             throw new Error("Clipboard API not supported by your browser.");
        }
      }, 'image/png');
      
    } catch (error: any) {
      console.error("Copy to clipboard failed:", error);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: error.message || "Could not copy image to clipboard."
      });
    } finally {
      setIsCopying(false);
    }
  };


  const renderPreview = () => {
    const props = { ...printData };
     switch (activeView) {
        case 'quotation': {
            const page = <QuotationPrint {...props} />;
            return (
                <div className="relative">
                    {page}
                </div>
            );
        }
        case 'challan': {
            return (props.requirements || []).map((req: Requirement) => {
                const page = <ChallanPrint {...props} requirements={[req]} />;
                 return (
                    <div key={`challan-${req.id}`} className="relative">
                        {page}
                    </div>
                )
            });
        }
        case 'production-challan': {
            const allPages: React.ReactNode[] = [];
            (props.requirements || []).forEach((req: Requirement) => {
                const page = <ProductionChallanPrint {...props} requirements={[req]} />;
                 allPages.push(
                    <div key={`prod-challan-${req.id}`} className="relative">
                        {page}
                    </div>
                );
            });
            return allPages;
        }
        default:
            return <p>Select a view</p>;
     }
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl print:max-w-none print:w-auto print:border-none print:p-0 print:shadow-none print:bg-white print:static">
        <DialogHeader className="print-hidden">
          <div className="flex items-center justify-between">
            <div>
                <DialogTitle>Order Document Preview</DialogTitle>
                <DialogDescription>Review and share the order documents below.</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="hidden sm:flex">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-md border bg-muted p-2 print-hidden">
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="sm:hidden">
                    <ArrowLeft className="h-4 w-4"/>
                </Button>
                 <Button variant={activeView === 'quotation' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('quotation')}>
                    <FileText className="mr-2 h-4 w-4"/> Quotation
                </Button>
                 <Button variant={activeView === 'challan' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('challan')}>
                    <Truck className="mr-2 h-4 w-4"/> Delivery Challan
                </Button>
                 <Button variant={activeView === 'production-challan' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('production-challan')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4"/> Production Challan
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)}><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setZoom(0.8)}><RotateCw className="h-4 w-4" /></Button>
                <Button onClick={handleCopy} disabled={isCopying} variant="outline">
                    {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy
                </Button>
                <Button onClick={handleShare} disabled={isGenerating} variant="outline">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                    Share
                </Button>
                <Button onClick={() => typeof window !== 'undefined' && window.print()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            </div>
        </div>

        <ScrollArea className="h-[70vh] w-full rounded-md border bg-gray-50 print:overflow-visible print:h-auto print:border-none print:bg-white print:p-0 print:static print:block">
          <div ref={previewContainerRef} className="p-4 flex justify-center print:p-0">
            <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
                className="transition-transform duration-200 space-y-4 print:transform-none print:[transform:none_!important] print:p-0"
            >
              {renderPreview()}
            </div>
          </div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
      </DialogContent>
    </Dialog>
  );
}
