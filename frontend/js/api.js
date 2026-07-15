/* NyaySetu API Client */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.API = {
    BASE: window.location.origin + '/api',

    _withSession(payload = {}) {
        const sessionId = NyaySetu.Session?.id;
        return sessionId ? { ...payload, session_id: sessionId } : payload;
    },

    async _readError(res) {
        const fallback = 'Server error: ' + res.status;
        try {
            const text = await res.text();
            if (!text) return fallback;
            try { const p = JSON.parse(text); return p.detail || p.error || p.message || fallback; }
            catch(e) { return text; }
        } catch(e) { return fallback; }
    },

    async get(endpoint) {
        const res = await fetch(this.BASE + endpoint);
        if (!res.ok) throw new Error(await this._readError(res));
        return res.json();
    },

    async streamPost(endpoint, body, onChunk, onDone, onError) {
        try {
            const payload = this._withSession(body);
            const res = await fetch(this.BASE + endpoint, {
                method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(await this._readError(res));
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while(true) {
                const {done, value} = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {stream:true});
                const events = buffer.split(/\n\n/);
                buffer = events.pop() ?? '';
                for (const event of events) {
                    for (const line of event.split(/\r?\n/).filter(Boolean)) {
                        if (!line.startsWith('data:')) continue;
                        const data = line.slice(5).trimStart();
                        if (data === '[DONE]') { onDone(); return; }
                        try { const p = JSON.parse(data); if(p.error){onError(p.error);return;} if(p.text) onChunk(p.text); } catch(e){}
                    }
                }
            }
            if (buffer.trim()) {
                for (const line of buffer.split(/\r?\n/)) {
                    if (!line.startsWith('data:')) continue;
                    const data = line.slice(5).trimStart();
                    if (data === '[DONE]') { onDone(); return; }
                    try { const p = JSON.parse(data); if(p.error){onError(p.error);return;} if(p.text) onChunk(p.text); } catch(e){}
                }
            }
            onDone();
        } catch(e) { onError(e.message); }
    },

    async post(endpoint, body) {
        const payload = this._withSession(body);
        const res = await fetch(this.BASE + endpoint, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await this._readError(res));
        return res.json();
    },

    async uploadFile(endpoint, file, extraFields = {}) {
        const form = new FormData();
        form.append('file', file);
        for (const [k,v] of Object.entries({...extraFields, session_id: NyaySetu.Session?.id || ''})) {
            if (v !== undefined && v !== null && v !== '') form.append(k, v);
        }
        const res = await fetch(this.BASE + endpoint, {method:'POST', body:form});
        if (!res.ok) throw new Error(await this._readError(res));
        return res.json();
    }
};
