'use client';

import * as React from 'react';
import Autoplay from 'embla-carousel-autoplay';

import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Image from 'next/image';
import { Button } from '../ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc } from '@/firebase';
import { cn } from '@/lib/utils';

type AdminSettings = {
    festiveTheme?: 'none' | 'diwali';
};

export function BannerCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );
  
  const { data: settings } = useDoc<AdminSettings>('settings/admin');

  const bannerData = [
    {
      id: 'banner-diwali',
      title: 'Happy Diwali! 🪔',
      description: 'Wishing you a prosperous year from Grow Money Team. Claim your festive rewards now!',
      buttonText: 'Get Bonus',
      buttonLink: '/plans',
      theme: 'diwali'
    },
    {
      id: 'banner-offer',
      title: 'Special Offer LIVE Now!',
      description: 'Claim a 10% extra bonus on your first deposit of the week.',
      buttonText: 'Claim Now',
      buttonLink: '/plans',
    },
    {
      id: 'banner-vip',
      title: 'Join the VIP Elite',
      description: 'Unlock lower withdrawal fees and priority support today.',
      buttonText: 'See Benefits',
      buttonLink: '/vip-tiers',
    },
    {
      id: 'banner-active-plan',
      title: 'Elite Plan is Active',
      description: 'The high-yield Alpha Pro plan is now open for limited slots.',
      buttonText: 'Invest Now',
      buttonLink: '/plans',
    }
  ];

  const banners = bannerData
    .filter(b => b.theme !== 'diwali' || settings?.festiveTheme === 'diwali')
    .map(banner => {
        const placeholder = PlaceHolderImages.find(img => img.id === banner.id);
        return {
            ...banner,
            imageUrl: placeholder?.imageUrl || 'https://picsum.photos/seed/finance/1200/400',
            imageHint: placeholder?.imageHint || 'finance'
        };
    });

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {banners.map((banner, index) => (
          <CarouselItem key={index}>
            <Card className="overflow-hidden border-none bg-transparent">
              <CardContent className="p-0">
                <div className={cn(
                    "relative aspect-video sm:aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.5/1]",
                    banner.theme === 'diwali' ? "bg-gradient-to-r from-purple-900 to-indigo-950" : ""
                )}>
                  {banner.theme === 'diwali' ? (
                      <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/diwali-pattern/1200/400')] opacity-20 mix-blend-overlay" />
                  ) : (
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title}
                        fill
                        priority={index === 0}
                        className="object-cover"
                        data-ai-hint={banner.imageHint}
                      />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                    <div className="space-y-1">
                        <h2 className={cn(
                            "text-2xl md:text-4xl font-black text-white tracking-tighter drop-shadow-2xl",
                            banner.theme === 'diwali' && "text-yellow-400 italic"
                        )}>
                        {banner.title}
                        </h2>
                        <p className="text-sm md:text-lg text-white/70 max-w-lg font-medium">
                        {banner.description}
                        </p>
                    </div>
                    <Button asChild className={cn(
                        "mt-6 w-fit h-11 px-8 rounded-xl font-bold shadow-2xl transition-all",
                        banner.theme === 'diwali' ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-primary text-white"
                    )}>
                      <a href={banner.buttonLink}>{banner.buttonText}</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
