'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import config from '@/lib/config.json';
import { getHomepageConfig } from '@/lib/admin-actions';
import { RepresentativesSection } from '@/components/representatives-section';


export default function ContactPage() {
  const { t } = useLanguage();
  const [businessContact, setBusinessContact] = useState({
    phoneNumber: config.businessPhoneNumber,
    whatsappNumber: config.businessWhatsAppNumber,
    googleMapsUrl: config.googleMapsUrl
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const hpConfig = await getHomepageConfig();
        if (hpConfig) {
          setBusinessContact({
            phoneNumber: hpConfig.businessPhoneNumber || config.businessPhoneNumber,
            whatsappNumber: hpConfig.businessWhatsAppNumber || config.businessWhatsAppNumber,
            googleMapsUrl: hpConfig.googleMapsUrl || config.googleMapsUrl
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadConfig();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-background mt-16 md:mt-28">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-4">
                <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Contact Us
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                  Have a question or want to discuss a project? Get in touch with us. We're here to help you build your dream space.
                </p>
                <div className="space-y-4 pt-6 text-lg">
                  <div className="flex items-start gap-4">
                    <MapPin className="mt-1 h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Our Office</h3>
                      <a 
                        href={businessContact.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-muted-foreground hover:text-primary flex items-center gap-2"
                      >
                        Main GT Road, Rawalpindi, Pakistan
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="mt-1 h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Phone</h3>
                      <a href={`tel:${businessContact.phoneNumber.replace(/\s/g, '')}`} className="text-muted-foreground hover:text-primary">{businessContact.phoneNumber}</a>
                    </div>
                  </div>
                   <div className="flex items-start gap-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-6 w-6 text-primary"><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/><path d="m16.5 13.5-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4"/></svg>
                    <div>
                      <h3 className="font-semibold">WhatsApp</h3>
                       <a href={`https://wa.me/${businessContact.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Click to Chat</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Mail className="mt-1 h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Email</h3>
                      <a href="mailto:info@stoneexpert.com" className="text-muted-foreground hover:text-primary">info@stoneexpert.com</a>
                    </div>
                  </div>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Send us a Message</CardTitle>
                  <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your Name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your.email@example.com" />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="e.g., Quotation for Kitchen Countertop" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Your message..." className="min-h-[120px]" />
                    </div>
                    <Button type="submit" className="w-full">Send Message</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Nationwide Regional Representatives Section */}
            <div className="mt-16 pt-12 border-t border-border/60">
              <RepresentativesSection />
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
