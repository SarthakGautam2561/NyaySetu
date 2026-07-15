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
    }
};
