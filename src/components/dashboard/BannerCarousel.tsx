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

const banners = [
  {
    title: 'Invest More, Earn More',
    description: 'Explore our new high-yield investment plans today.',
    imageUrl: 'https://picsum.photos/seed/banner1/1200/400',
    imageHint: 'finance growth',
    buttonText: 'View Plans',
    buttonLink: '/plans',
  },
  {
    title: 'Invite Friends, Get Rewards',
    description: 'Earn a bonus for every friend who makes their first investment.',
    imageUrl: 'https://picsum.photos/seed/banner2/1200/400',
    imageHint: 'team friends',
    buttonText: 'Get Code',
    buttonLink: '/profile',
  },
  {
    title: 'Secure Group Loans',
    description: 'Invest together in high-value loan opportunities.',
    imageUrl: 'https://picsum.photos/seed/banner3/1200/400',
    imageHint: 'teamwork community',
    buttonText: 'Explore Group Loans',
    buttonLink: '/group-investing',
  },
];

export function BannerCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

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
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video sm:aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.5/1]">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    fill
                    className="object-cover"
                    data-ai-hint={banner.imageHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                    <h2 className="text-xl md:text-3xl font-bold text-white">
                      {banner.title}
                    </h2>
                    <p className="text-sm md:text-base text-white/80 mt-1">
                      {banner.description}
                    </p>
                    <Button asChild className="mt-4 w-fit">
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
