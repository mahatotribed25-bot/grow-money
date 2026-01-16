'use client';

import Script from 'next/script';

export function AdsterraNativeBanner() {
  return (
    <div className="flex w-full justify-center my-4">
      <div id="container-10d601e6e5e0c81bf640524d6092e5f3"></div>
      <Script
        id="adsterra-native-banner"
        async
        data-cfasync="false"
        src="//pl28494441.effectivegatecpm.com/10d601e6e5e0c81bf640524d6092e5f3/invoke.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
