
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

export function BannerCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const bannerData = [
    {
      id: 'banner-offer',
      title: 'Special Offer LIVE Now!',
      description: 'Claim a 10% extra bonus on your first deposit of the week.',
      buttonText: 'Claim Now',
      buttonLink: '/plans',
    },
    {
      id: 'banner-active-plan',
      title: 'Elite Plan is Active',
      description: 'The high-yield Alpha Pro plan is now open for limited slots.',
      buttonText: 'Invest Now',
      buttonLink: '/plans',
    },
    {
      id: 'banner-invest',
      title: 'Invest More, Earn More',
      description: 'Explore our latest high-yield fixed-return investment plans.',
      buttonText: 'View Plans',
      buttonLink: '/plans',
    },
    {
      id: 'banner-referral',
      title: 'Invite Friends, Get Cash',
      description: 'Earn ₹50 for every friend who joins and invests today.',
      buttonText: 'Get Code',
      buttonLink: '/profile',
    },
    {
      id: 'banner-group',
      title: 'Secure Group Loans',
      description: 'Invest together in high-value loan opportunities for shared profit.',
      buttonText: 'Explore Groups',
      buttonLink: '/group-investing',
    },
  ];

  const banners = bannerData.map(banner => {
    const placeholder = PlaceHolderImages.find(img => img.id === banner.id);
    return {
      ...banner,
      imageUrl: placeholder?.imageUrl || 'https://picsum.photos/seed/fallback/1200/400',
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
                <div className="relative aspect-video sm:aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.5/1]">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    fill
                    priority={index === 0}
                    className="object-cover"
                    data-ai-hint={banner.imageHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter drop-shadow-2xl">
                        {banner.title}
                        </h2>
                        <p className="text-sm md:text-lg text-white/70 max-w-lg font-medium">
                        {banner.description}
                        </p>
                    </div>
                    <Button asChild className="mt-6 w-fit h-11 px-8 rounded-xl font-bold bg-primary text-white shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
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
