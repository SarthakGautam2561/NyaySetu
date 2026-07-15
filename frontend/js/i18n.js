/* NyaySetu i18n — UI string translations */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.I18n = {
    current: 'en',
    strings: {
        en: { dashboard_title: 'How can I help you today?', dashboard_subtitle: 'Choose a service below or ask me anything about your legal situation.', chat_title: 'AI Legal Chat', chat_desc: 'Ask any legal question and get clear, simple answers with next steps.', doc_title: 'Document X-Ray', doc_desc: 'Upload legal documents for AI-powered risk analysis.', draft_title: 'Draft Generator', draft_desc: 'Auto-generate complaints, RTI applications & more.', path_title: 'Legal Pathway', path_desc: 'Get a visual step-by-step action plan.', voice_title: 'Voice Assistant', voice_desc: 'Speak your legal problem in any language.', rights_title: 'Know Your Rights', rights_desc: 'Explore your legal rights by category.' },
        hi: { dashboard_title: 'आज मैं आपकी कैसे मदद कर सकता हूँ?', dashboard_subtitle: 'नीचे कोई सेवा चुनें या अपनी कानूनी स्थिति के बारे में कुछ भी पूछें।', chat_title: 'AI कानूनी चैट', chat_desc: 'कोई भी कानूनी सवाल पूछें और सरल जवाब पाएं।', doc_title: 'दस्तावेज़ एक्स-रे', doc_desc: 'कानूनी दस्तावेज़ अपलोड करें और AI विश्लेषण पाएं।', draft_title: 'ड्राफ्ट जनरेटर', draft_desc: 'शिकायत, RTI आवेदन आदि स्वतः बनाएं।', path_title: 'कानूनी मार्ग', path_desc: 'कदम-दर-कदम कार्य योजना पाएं।', voice_title: 'वॉइस सहायक', voice_desc: 'किसी भी भाषा में बोलें।', rights_title: 'अपने अधिकार जानें', rights_desc: 'श्रेणी के अनुसार अधिकार खोजें।' },
        bn: { dashboard_title: 'আজ আমি কিভাবে সাহায্য করতে পারি?', dashboard_subtitle: 'নীচে একটি সেবা বেছে নিন।', chat_title: 'AI আইনি চ্যাট', doc_title: 'ডকুমেন্ট এক্স-রে', draft_title: 'ড্রাফট জেনারেটর', path_title: 'আইনি পথ', voice_title: 'ভয়েস সহকারী', rights_title: 'আপনার অধিকার জানুন' },
        ta: { dashboard_title: 'இன்று நான் எப்படி உதவ முடியும்?', chat_title: 'AI சட்ட அரட்டை', doc_title: 'ஆவண எக்ஸ்-ரே', draft_title: 'வரைவு ஜெனரேட்டர்', path_title: 'சட்ட பாதை', voice_title: 'குரல் உதவியாளர்', rights_title: 'உங்கள் உரிமைகள்' },
    },

    t(key) { return (this.strings[this.current] && this.strings[this.current][key]) || (this.strings.en[key]) || key; },

    init() {
        const saved = localStorage.getItem('nyaysetu_language');
        if (saved && this.strings[saved]) {
            this.current = saved;
        }
        const select = document.getElementById('langSelect');
        if (select) select.value = this.current;
        this.setLanguage(this.current);
    },

    names: {
        en: 'English (India)',
        hi: 'Hindi (India)',
        bn: 'Bengali (India)',
        ta: 'Tamil (India)',
        te: 'Telugu (India)'
    },

    setLanguage(lang) {
        this.current = lang;
        localStorage.setItem('nyaysetu_language', lang);
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = this.t(key);
            if (val) el.textContent = val;
        });
        const dashLabel = document.getElementById('dashLangLabel');
        if (dashLabel && this.names[lang]) {
            dashLabel.textContent = this.names[lang];
        }
    }
};
