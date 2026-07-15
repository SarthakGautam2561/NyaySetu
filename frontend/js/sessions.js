/* NyaySetu Session Manager — multi-chat memory and personalization */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.Sessions = {
    list: [],
    activeId: null,

    async init() {
        this.activeId = NyaySetu.Session?.id || localStorage.getItem('nyaysetu_session_id') || null;
        await this.refresh({ quiet: true });
        this.updateMemoryPills();
    },

    async refresh(options = {}) {
        try {
            const data = await NyaySetu.API.get('/sessions?limit=20');
            this.list = data.sessions || [];
            if (this.activeId && !this.list.some((session) => session.id === this.activeId) && this.list.length) {
                this.activeId = this.list[0].id;
                NyaySetu.Session.id = this.activeId;
                localStorage.setItem('nyaysetu_session_id', this.activeId);
            } else if (!this.activeId && this.list.length) {
                this.activeId = this.list[0].id;
                NyaySetu.Session.id = this.activeId;
                localStorage.setItem('nyaysetu_session_id', this.activeId);
            }
            this.render();
            if (!options.quiet) this.updateMemoryPills();
        } catch (e) {
            if (!options.quiet) NyaySetu.App.toast('Could not load chat history.', 'error');
        }
    },

    render() {
        const container = document.getElementById('sessionList');
        if (!container) return;
        if (!this.list.length) {
            container.innerHTML = `
                <div class="session-empty">
                    <strong>No chats yet</strong>
                    <p>Start a new case to save the conversation as a separate thread.</p>
                </div>`;
            this.updateMemoryPills();
            return;
        }
        container.innerHTML = this.list.map((session) => {
            const isActive = session.id === this.activeId;
            const preview = session.last_message ? this._truncate(session.last_message, 56) : 'No messages yet';
            const pinIcon = session.pinned ? '📌' : '•';
            return `
                <button class="session-item ${isActive ? 'active' : ''}" data-id="${session.id}">
                    <div class="session-dot">${pinIcon}</div>
                    <div class="session-copy">
                        <strong>${this._escapeHtml(session.title || 'New chat')}</strong>
                        <span>${this._escapeHtml(preview)}</span>
                    </div>
                    <div class="session-meta">
                        <small>${session.message_count || 0}</small>
                    </div>
                </button>`;
        }).join('');

        container.querySelectorAll('.session-item').forEach((button) => {
            button.addEventListener('click', () => this.switchTo(button.dataset.id));
        });
        this.renderRecentHistory();
        this.updateMemoryPills();
    },

    async switchTo(sessionId) {
        if (!sessionId || sessionId === this.activeId) return;
        this.activeId = sessionId;
        NyaySetu.Session.id = sessionId;
        localStorage.setItem('nyaysetu_session_id', sessionId);
        await NyaySetu.Chat.loadSession(sessionId, { preservePanel: true });
        this.render();
        NyaySetu.App.toast('Switched chat thread.', 'success');
    },

    async create() {
        const data = await NyaySetu.API.post('/sessions', { language: NyaySetu.I18n.current });
        this.activeId = data.session_id;
        NyaySetu.Session.id = data.session_id;
        localStorage.setItem('nyaysetu_session_id', data.session_id);
        await NyaySetu.Chat.loadSession(data.session_id, { preservePanel: true });
        await this.refresh({ quiet: true });
        NyaySetu.App.toast('Started a new chat thread.', 'success');
    },

    async renameActive() {
        if (!this.activeId) return;
        const current = this.list.find((session) => session.id === this.activeId);
        const nextTitle = prompt('Rename this chat', current?.title || 'New chat');
        if (!nextTitle) return;
        await NyaySetu.API.patch(`/sessions/${this.activeId}`, { title: nextTitle });
        await this.refresh({ quiet: true });
    },

    async pinActive() {
        if (!this.activeId) return;
        const current = this.list.find((session) => session.id === this.activeId);
        await NyaySetu.API.patch(`/sessions/${this.activeId}`, { pinned: !current?.pinned });
        await this.refresh({ quiet: true });
    },

    setActive(sessionId) {
        this.activeId = sessionId;
        this.updateMemoryPills();
        this.render();
    },

    updateMemoryPills() {
        const active = this.list.find((session) => session.id === this.activeId);
        const languageLabel = document.getElementById('prefLanguage');
        const caseLabel = document.getElementById('prefCaseFocus');
        if (languageLabel) languageLabel.textContent = NyaySetu.I18n.current.toUpperCase();
        if (caseLabel) caseLabel.textContent = active?.title || 'General guidance';
        this.renderRecentHistory();
    },

    renderRecentHistory() {
        const container = document.getElementById('recentHistoryWidget');
        if (!container) return;
        if (!this.list.length) {
            container.innerHTML = `
                <div class="session-empty">
                    <strong>No history yet</strong>
                    <p>Open a case to start building memory.</p>
                </div>`;
            return;
        }
        container.innerHTML = this.list.slice(0, 3).map((session) => {
            const preview = session.last_message ? this._truncate(session.last_message, 72) : 'No messages yet';
            return `
                <div class="recent-item">
                    <strong>${this._escapeHtml(session.title || 'New chat')}</strong>
                    <span>${this._escapeHtml(preview)}</span>
                </div>`;
        }).join('');
    },

    _truncate(text, limit) {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
    },

    _escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};
