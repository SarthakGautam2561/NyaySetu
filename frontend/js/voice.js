/* NyaySetu Voice Assistant Module */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.Voice = {
    recognition: null, isRecording: false, target: null, history: [],
    init() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        this.recognition = new SR();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            if (this.target === 'chat') { document.getElementById('chatInput').value = text; NyaySetu.Chat.send(); }
            else if (this.target === 'dashboard') { document.getElementById('dashboardInput').value = text; }
            else {
                document.getElementById('voiceTranscript').classList.remove('hidden');
                document.getElementById('voiceTranscriptText').textContent = text;
                this._getVoiceResponse(text);
            }
        };
        this.recognition.onend = () => this._stopUI();
        this.recognition.onerror = () => this._stopUI();
    },
    toggleMic(target) {
        this.target = target;
        if (!this.recognition) { NyaySetu.App.toast('Voice not supported. Try Chrome.', 'error'); return; }
        const langMap = { hi:'hi-IN', bn:'bn-IN', ta:'ta-IN', te:'te-IN', mr:'mr-IN', gu:'gu-IN', kn:'kn-IN', ml:'ml-IN', pa:'pa-IN', es:'es-ES', fr:'fr-FR', en:'en-US' };
        this.recognition.lang = langMap[NyaySetu.I18n.current] || 'en-US';
        if (this.isRecording) { this.recognition.stop(); } else {
            this.recognition.start(); this.isRecording = true;
            if (target === 'chat') { const btn = document.getElementById('chatMicBtn'); if(btn) btn.classList.add('text-error'); }
            else if (target === 'dashboard') { const btn = document.getElementById('dashMicBtn'); if(btn) btn.classList.add('text-error'); }
            else if (target === 'voice') { document.getElementById('voiceMicCircle').classList.add('bg-error'); document.getElementById('voiceStatus').textContent = 'Listening...'; }
        }
    },
    _stopUI() {
        this.isRecording = false;
        document.getElementById('chatMicBtn')?.classList.remove('text-error');
        document.getElementById('dashMicBtn')?.classList.remove('text-error');
        const c = document.getElementById('voiceMicCircle');
        if (c) { c.classList.remove('bg-error'); document.getElementById('voiceStatus').textContent = 'Tap the microphone to speak again.'; }
    },
    async _getVoiceResponse(text) {
        const resDiv = document.getElementById('voiceResponse');
        const resText = document.getElementById('voiceResponseText');
        resDiv.classList.remove('hidden'); resText.textContent = 'Thinking...';
        
        // Add context for voice assistant: keep it brief, conversational, and avoid markdown.
        const voicePrompt = text + " (IMPORTANT: I am talking to you via voice. Speak to me naturally. Keep your response short, under 3 sentences. Do not use lists, bullet points, asterisks, or markdown formatting.)";
        
        let full = '';
        NyaySetu.API.streamPost('/chat', { message: voicePrompt, history: this.history, language: NyaySetu.I18n.current },
            (c) => { full += c; resText.textContent = full.replace(/[*#_]/g,''); },
            () => { 
                this.history.push({ role: 'user', content: text });
                this.history.push({ role: 'assistant', content: full });
                if (this.history.length > 8) this.history = this.history.slice(-8); // keep last 4 turns
                
                if (window.speechSynthesis) { 
                    const cleanText = full.replace(/[*#_]/g,'').substring(0,500);
                    const u = new SpeechSynthesisUtterance(cleanText); 
                    u.lang = this.recognition.lang; 
                    u.rate = 0.95; 
                    speechSynthesis.speak(u); 
                } 
            },
            (err) => { resText.textContent = 'Error: ' + err; }
        );
    }
};
