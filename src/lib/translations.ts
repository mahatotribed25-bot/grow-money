export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'te' | 'ml' | 'ta' | 'kn' | 'bn' | 'bh';

export const translations: Record<Language, any> = {
  en: {
    nav: {
      home: "Home",
      plans: "Plans",
      leaders: "Leaders",
      loans: "Loans",
      profile: "Profile"
    },
    dashboard: {
      balance: "Verified Capital",
      recharge: "Recharge",
      withdraw: "Withdraw",
      active_portfolios: "Active Portfolios",
      browse_market: "Browse Market",
      service_integration: "Service Integration",
      market: "Market",
      wheel: "Wheel",
      standard_loan: "Standard Loan",
      flexi_loan: "Flexi Loan",
      syndicate: "Syndicate"
    },
    profile: {
      title: "Investor Account",
      node: "Investor Node",
      identity: "Identity Verification",
      payment: "Payment Node",
      referral: "Referral Link",
      logout: "De-Authorize Identity",
      kyc_status: "KYC Status",
      ledger: "Ledger",
      recharge: "Recharge",
      payout: "Payout",
      pools: "Pools",
      export: "Export to Excel",
      select_lang: "Select Language"
    }
  },
  hi: {
    nav: {
      home: "होम",
      plans: "प्लान्स",
      leaders: "लीडर्स",
      loans: "लोन्स",
      profile: "प्रोफ़ाइल"
    },
    dashboard: {
      balance: "सत्यापित पूंजी",
      recharge: "रिचार्ज",
      withdraw: "निकासी",
      active_portfolios: "सक्रिय पोर्टफोलियो",
      browse_market: "बाजार देखें",
      service_integration: "सेवा एकीकरण",
      market: "बाजार",
      wheel: "व्हील",
      standard_loan: "स्टैंडर्ड लोन",
      flexi_loan: "फ्लेक्सी लोन",
      syndicate: "सिंडिकेट"
    },
    profile: {
      title: "निवेशक खाता",
      node: "निवेशक नोड",
      identity: "पहचान सत्यापन",
      payment: "भुगतान नोड",
      referral: "रेफरल लिंक",
      logout: "पहचान डी-ऑथोराइज़ करें",
      kyc_status: "KYC स्थिति",
      ledger: "खाता बही",
      recharge: "रिचार्ज",
      payout: "पेआउट",
      pools: "पूल",
      export: "एक्सेल में एक्सपोर्ट करें",
      select_lang: "भाषा चुनें"
    }
  },
  mr: {
    nav: {
      home: "होम",
      plans: "प्लॅन्स",
      leaders: "लीडर्स",
      loans: "लोन्स",
      profile: "प्रोफाइल"
    },
    dashboard: {
      balance: "पडताळणी केलेली भांडवल",
      recharge: "रिचार्ज",
      withdraw: "पैसे काढा",
      active_portfolios: "सक्रिय पोर्टफोलिओ",
      browse_market: "बाजार पहा",
      service_integration: "सेवा एकत्रीकरण",
      market: "बाजार",
      wheel: "व्हील",
      standard_loan: "स्टँडर्ड लोन",
      flexi_loan: "फ्लेक्सी लोन",
      syndicate: "सिंडिकेट"
    },
    profile: {
      title: "गुंतवणूकदार खाते",
      node: "गुंतवणूकदार नोड",
      identity: "ओळख पडताळणी",
      payment: "पेमेंट नोड",
      referral: "रेफरल लिंक",
      logout: "ओळख डी-ऑथोराईझ करा",
      kyc_status: "KYC स्थिती",
      ledger: "खाते वही",
      recharge: "रिचार्ज",
      payout: "पेआउट",
      pools: "पूल",
      export: "एक्सेलमध्ये एक्सपोर्ट करा",
      select_lang: "भाषा निवडा"
    }
  },
  gu: {
    nav: {
      home: "હોમ",
      plans: "પ્લાન્સ",
      leaders: "લીડર્સ",
      loans: "લોન્સ",
      profile: "પ્રોફાઇલ"
    },
    dashboard: {
      balance: "ચકાસાયેલ મૂડી",
      recharge: "રિચાર્જ",
      withdraw: "ઉપાડ",
      active_portfolios: "સક્રિય પોર્ટફોલિયો",
      browse_market: "બજાર જુઓ",
      service_integration: "સેવા એકીકરણ",
      market: "બજાર",
      wheel: "વ્હીલ",
      standard_loan: "સ્ટાન્ડર્ડ લોન",
      flexi_loan: "ફ્લેક્સી લોન",
      syndicate: "સિન્ડિકેટ"
    },
    profile: {
      title: "રોકાણકાર ખાતું",
      node: "રોકાણકાર નોડ",
      identity: "ઓળખ ચકાસણી",
      payment: "પેમેન્ટ નોડ",
      referral: "રેફરલ લિંક",
      logout: "ઓળખ ડી-ઓથોરાઇઝ કરો",
      kyc_status: "KYC સ્થિતિ",
      ledger: "ખાતાવહી",
      recharge: "રિચાર્જ",
      payout: "પેઆઉટ",
      pools: "પૂલ",
      export: "એક્સેલમાં એક્સપોર્ટ કરો",
      select_lang: "ભાષા પસંદ કરો"
    }
  },
  te: {
    nav: {
      home: "హోమ్",
      plans: "ప్లాన్స్",
      leaders: "లీడర్స్",
      loans: "లోన్స్",
      profile: "ప్రొఫైల్"
    },
    dashboard: {
      balance: "ధృవీకరించబడిన మూలధనం",
      recharge: "రీఛార్జ్",
      withdraw: "విత్ డ్రా",
      active_portfolios: "క్రియాశీల పోర్ట్‌ఫోలియోలు",
      browse_market: "మార్కెట్ బ్రౌజ్ చేయండి",
      service_integration: "సేవా ఇంటిగ్రేషన్",
      market: "మార్కెట్",
      wheel: "వీల్",
      standard_loan: "స్టాండర్డ్ లోన్",
      flexi_loan: "ఫ్లెక్సీ లోన్",
      syndicate: "సిండికేట్"
    },
    profile: {
      title: "పెట్టుబడిదారుల ఖాతా",
      node: "పెట్టుబడిదారుల నోడ్",
      identity: "గుర్తింపు ధృవీకరణ",
      payment: "చెల్లింపు నోడ్",
      referral: "రిఫరల్ లింక్",
      logout: "లాగ్ అవుట్",
      kyc_status: "KYC స్థితి",
      ledger: "లెడ్జర్",
      recharge: "రీఛార్జ్",
      payout: "పేఅవుట్",
      pools: "పూల్స్",
      export: "Excel కి ఎగుమతి చేయండి",
      select_lang: "భాషను ఎంచుకోండి"
    }
  },
  ml: {
    nav: {
      home: "ഹോം",
      plans: "പ്ലാനുകൾ",
      leaders: "ലീഡേഴ്സ്",
      loans: "ലോണുകൾ",
      profile: "പ്രൊഫൈൽ"
    },
    dashboard: {
      balance: "പരിശോധിച്ച മൂലധനം",
      recharge: "റീചാർജ്",
      withdraw: "പിൻവലിക്കുക",
      active_portfolios: "സജീവ പോർട്ട്ഫോളിയോകൾ",
      browse_market: "മാർക്കറ്റ് നോക്കുക",
      service_integration: "സർവീസ് ഇന്റഗ്രേഷൻ",
      market: "മാർക്കറ്റ്",
      wheel: "വീൽ",
      standard_loan: "സ്റ്റാൻഡേർഡ് ലോൺ",
      flexi_loan: "ഫ്ലെക്സി ലോൺ",
      syndicate: "സിൻഡിക്കേറ്റ്"
    },
    profile: {
      title: "ഇൻവെസ്റ്റർ അക്കൗണ്ട്",
      node: "ഇൻവെസ്റ്റർ നോഡ്",
      identity: "തിരിച്ചറിയൽ രേഖകൾ",
      payment: "പേയ്മെന്റ് നോഡ്",
      referral: "റഫറൽ ലിങ്ക്",
      logout: "ലോഗ് ഔട്ട്",
      kyc_status: "KYC സ്റ്റാറ്റസ്",
      ledger: "ലെഡ്ജർ",
      recharge: "റീചാർജ്",
      payout: "പേഔട്ട്",
      pools: "പൂളുകൾ",
      export: "Excel-ലേക്ക് സേവ് ചെയ്യുക",
      select_lang: "ഭാഷ തിരഞ്ഞെടുക്കുക"
    }
  },
  ta: {
    nav: {
      home: "முகப்பு",
      plans: "திட்டங்கள்",
      leaders: "தலைவர்கள்",
      loans: "கடன்கள்",
      profile: "சுயவிவரம்"
    },
    dashboard: {
      balance: "சரிபார்க்கப்பட்ட மூலதனம்",
      recharge: "ரீசார்ஜ்",
      withdraw: "திரும்பப் பெறு",
      active_portfolios: "செயலில் உள்ள போர்ட்ஃபோலியோக்கள்",
      browse_market: "சந்தையை உலாவுக",
      service_integration: "சேவை ஒருங்கிணைப்பு",
      market: "சந்தை",
      wheel: "சக்கரம்",
      standard_loan: "நிலையான கடன்",
      flexi_loan: "நெகிழ்வான கடன்",
      syndicate: "சிண்டிகேட்"
    },
    profile: {
      title: "முதலீட்டாளர் கணக்கு",
      node: "முதலீட்டாளர் முனை",
      identity: "அடையாள சரிபார்ப்பு",
      payment: "கட்டண முனை",
      referral: "பரிந்துரை இணைப்பு",
      logout: "வெளியேறு",
      kyc_status: "KYC நிலை",
      ledger: "பேரேடு",
      recharge: "ரீசார்ஜ்",
      payout: "கொடுப்பனவு",
      pools: "குழுக்கள்",
      export: "Excel-க்கு ஏற்றுமதி செய்",
      select_lang: "மொழியைத் தேர்ந்தெடு"
    }
  },
  kn: {
    nav: {
      home: "ಮುಖಪುಟ",
      plans: "ಯೋಜನೆಗಳು",
      leaders: "ನಾಯಕರು",
      loans: "ಸಾಲಗಳು",
      profile: "ಪ್ರೊಫೈಲ್"
    },
    dashboard: {
      balance: "ಪರಿಶೀಲಿಸಿದ ಬಂಡವಾಳ",
      recharge: "ರೀಚಾರ್ಜ್",
      withdraw: "ಹಿಂಪಡೆಯಿರಿ",
      active_portfolios: "ಸಕ್ರಿಯ ಪೋರ್ಟ್‌ಫೋಲಿಯೋಗಳು",
      browse_market: "ಮಾರುಕಟ್ಟೆ ವೀಕ್ಷಿಸಿ",
      service_integration: "ಸೇವೆ ಸಂಯೋಜನೆ",
      market: "ಮಾರುಕಟ್ಟೆ",
      wheel: "ಚಕ್ರ",
      standard_loan: "ಸ್ಟ್ಯಾಂಡರ್ಡ್ ಸಾಲ",
      flexi_loan: "ಫ್ಲೆಕ್ಸಿ ಸಾಲ",
      syndicate: "ಸಿಂಡಿಕೇಟ್"
    },
    profile: {
      title: "ಹೂಡಿಕೆದಾರರ ಖಾತೆ",
      node: "ಹೂಡಿಕೆದಾರರ ನೋಡ್",
      identity: "ಗುರುತಿನ ಪರಿಶೀಲನೆ",
      payment: "ಪಾವತಿ ನೋಡ್",
      referral: "ರೆಫರಲ್ ಲಿಂಕ್",
      logout: "ಲಾಗ್ ಔಟ್",
      kyc_status: "KYC ಸ್ಥಿತಿ",
      ledger: "ಲೆಡ್ಜರ್",
      recharge: "ರೀಚಾರ್ಜ್",
      payout: "ಪೇಔಟ್",
      pools: "ಪೂಲ್ಸ್",
      export: "Excel ಗೆ ರಫ್ತು ಮಾಡಿ",
      select_lang: "ಭಾಷೆಯನ್ನು ಆರಿಸಿ"
    }
  },
  bn: {
    nav: {
      home: "হোম",
      plans: "প্ল্যান",
      leaders: "লিডারস",
      loans: "লোন",
      profile: "প্রোফাইল"
    },
    dashboard: {
      balance: "যাচাইকৃত মূলধন",
      recharge: "রিচার্জ",
      withdraw: "টাকা তোলা",
      active_portfolios: "সক্রিয় পোর্টফোলিও",
      browse_market: "মার্কেট দেখুন",
      service_integration: "পরিষেবা ইন্টিগ্রেশন",
      market: "মার্কেট",
      wheel: "হুইল",
      standard_loan: "স্ট্যান্ডার্ড লোন",
      flexi_loan: "ফ্লেক্সি লোন",
      syndicate: "সিন্ডিকেট"
    },
    profile: {
      title: "বিনিয়োগকারী অ্যাকাউন্ট",
      node: "বিনিয়োগকারী নোড",
      identity: "পরিচয় যাচাইকরণ",
      payment: "পেমেন্ট নোড",
      referral: "রেফারেল লিঙ্ক",
      logout: "লগ আউট",
      kyc_status: "KYC স্ট্যাটাস",
      ledger: "লেজার",
      recharge: "রিচার্জ",
      payout: "পেআউট",
      pools: "পুল",
      export: "Excel এ এক্সপোর্ট করুন",
      select_lang: "ভাষা নির্বাচন করুন"
    }
  },
  bh: {
    nav: {
      home: "होम",
      plans: "प्लान",
      leaders: "लीडर्स",
      loans: "लोन",
      profile: "प्रोफाइल"
    },
    dashboard: {
      balance: "सत्यापित पूंजी",
      recharge: "रिचार्ज",
      withdraw: "निकासी",
      active_portfolios: "सक्रिय पोर्टफोलियो",
      browse_market: "बजार देखीं",
      service_integration: "सेवा एकीकरण",
      market: "बजार",
      wheel: "व्हील",
      standard_loan: "स्टैंडर्ड लोन",
      flexi_loan: "फ्लेक्सी लोन",
      syndicate: "सिंडिकेट"
    },
    profile: {
      title: "निवेशक खाता",
      node: "निवेशक नोड",
      identity: "पहचान सत्यापन",
      payment: "भुगतान नोड",
      referral: "रेफरल लिंक",
      logout: "लॉग आउट",
      kyc_status: "KYC स्थिति",
      ledger: "खाता बही",
      recharge: "रिचार्ज",
      payout: "पेआउट",
      pools: "पूल",
      export: "एक्सेल में एक्सपोर्ट करीं",
      select_lang: "भाषा चुनीं"
    }
  }
};
