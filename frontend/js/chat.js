/* NyaySetu Chat - Stitch Light Theme */
window.NyaySetu = window.NyaySetu || {};
NyaySetu.Chat = {
    history: [], isStreaming: false,
    send() {
        const input = document.getElementById('chatInput');
        const msg = input.value.trim();
        if (!msg || this.isStreaming) return;
        input.value = '';
        this._addBubble('user', msg);
        this.history.push({role:'user',content:msg});
        this._stream(msg);
    },
    sendSuggestion(el) { document.getElementById('chatInput').value = el.textContent; this.send(); },
    _addBubble(role, html) {
        const c = document.getElementById('chatMessages');
        const wrap = document.createElement('div');
        wrap.className = 'flex gap-4 max-w-3xl animate-fadeIn ' + (role==='user' ? 'self-end flex-row-reverse' : '');
        const avatar = document.createElement('div');
        if (role === 'user') {
            avatar.className = 'w-9 h-9 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1';
            avatar.innerHTML = '<span class="text-primary text-label-sm font-bold">U</span>';
        } else {
            avatar.className = 'w-9 h-9 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1';
            avatar.innerHTML = '<span class="material-symbols-outlined text-primary text-[20px]">smart_toy</span>';
        }
        const bubble = document.createElement('div');
        if (role === 'user') {
            bubble.className = 'bg-primary text-on-primary rounded-2xl rounded-tr-none p-5 shadow-lg font-medium leading-relaxed';
        } else {
            bubble.className = 'glass-card rounded-2xl rounded-tl-none p-5 shadow-sm text-on-surface leading-relaxed';
        }
        bubble.innerHTML = html;
        wrap.appendChild(avatar); wrap.appendChild(bubble);
        c.appendChild(wrap); c.scrollTop = c.scrollHeight;
        return bubble;
    },
    _showTyping() {
        const c = document.getElementById('chatMessages');
        const d = document.createElement('div'); d.className = 'typing-indicator'; d.id = 'typingIndicator';
        d.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        c.appendChild(d); c.scrollTop = c.scrollHeight;
    },
    _removeTyping() { document.getElementById('typingIndicator')?.remove(); },
    _stream(message) {
        this.isStreaming = true; this._showTyping();
        let full = '', bubble = null;
        NyaySetu.API.streamPost('/chat',
            {message, history: this.history.slice(-10), language: NyaySetu.I18n.current},
            (chunk) => {
                if (!bubble) { this._removeTyping(); bubble = this._addBubble('assistant',''); }
                full += chunk;
                bubble.innerHTML = this._md(full);
                document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            },
            () => { this.isStreaming = false; this._removeTyping(); if (full) this.history.push({role:'assistant',content:full}); if(!bubble) this._addBubble('assistant','Sorry, I could not generate a response.'); },
            (err) => { this.isStreaming = false; this._removeTyping(); this._addBubble('assistant','Error: '+err); }
        );
    },
    _md(t) {
        return t.replace(/\*\*(.*?)\*\*/g,'<strong class="text-primary font-bold">$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/^### (.*$)/gm,'<h4 class="font-semibold text-lg mt-3 mb-1 text-on-surface">$1</h4>').replace(/^## (.*$)/gm,'<h3 class="font-bold text-xl mt-4 mb-2 text-on-surface">$1</h3>').replace(/^\- (.*$)/gm,'<li class="ml-4 text-on-surface-variant">$1</li>').replace(/^\d+\. (.*$)/gm,'<li class="ml-4 text-on-surface-variant">$1</li>').replace(/\n\n/g,'</p><p class="mt-2">').replace(/\n/g,'<br>');
    },
    async loadSession(sessionId) {
        try {
            const data = await NyaySetu.API.get(`/sessions/${sessionId}/messages`);
            const messages = data.messages || [];
            const c = document.getElementById('chatMessages');
            if (c) {
                c.innerHTML = `
                <div class="flex gap-4 max-w-3xl animate-fadeIn">
                    <div class="w-9 h-9 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1"><span class="material-symbols-outlined text-primary text-[20px]">smart_toy</span></div>
                    <div class="glass-card rounded-2xl rounded-tl-none p-5 shadow-sm">
                      <p class="text-on-surface leading-relaxed"><strong>Welcome to NyaySetu!</strong> I'm your AI legal assistant. Tell me about your legal question, and I'll help you understand your rights in simple language.</p>
                      <div class="mt-3 border-t border-primary/5 pt-3"><p class="text-[10px] text-outline uppercase tracking-wider flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">shield</span>This is not legal advice. For formal representation, consult a qualified attorney.</p></div>
                    </div>
                </div>`;
                this.history = [];
                for (const m of messages) {
                    this._addBubble(m.role, this._md(m.content));
                    this.history.push({ role: m.role, content: m.content });
                }
            }
        } catch (e) {
            console.error('Could not load session messages', e);
        }
    }
};
