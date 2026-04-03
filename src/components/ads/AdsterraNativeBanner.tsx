'use client';

import Script from 'next/script';

export function AdsterraNativeBanner() {
  return (
    <>
      <Script
        id="adsterra-ad-invoker"
        async={true}
        data-cfasync="false"
        src="https://pl28494441.profitablecpmratenetwork.com/10d601e6e5e0c81bf640524d6092e5f3/invoke.js"
        strategy="afterInteractive"
      />
      <div id="container-10d601e6e5e0c81bf640524d6092e5f3" />
    </>
  );
}
