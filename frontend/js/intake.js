/* NyaySetu Case Compass Module */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.Intake = {
    lastResult: null,

    init() {
        const input = document.getElementById('intakeInput');
        const examples = document.getElementById('intakeExamples');
        if (examples) {
            examples.querySelectorAll('[data-intake]').forEach((chip) => {
                chip.addEventListener('click', () => {
                    if (input) input.value = chip.dataset.intake;
                });
            });
        }
    },

    async analyze() {
        const input = document.getElementById('intakeInput');
        const text = input?.value.trim();
        if (!text || text.length < 10) {
            NyaySetu.App.toast('Please describe the legal situation in a bit more detail.', 'error');
            return;
        }

        const result = document.getElementById('intakeResult');
        result.innerHTML = '<div class="spinner"></div><p class="loading-text">🧭 Building your case map...</p>';

        try {
            const data = await NyaySetu.API.post('/intake', { text, language: NyaySetu.I18n.current });
            this.lastResult = { text, data };
            this._render(data, result);
        } catch (e) {
            result.innerHTML = `<div class="card" style="border-color:var(--danger)">❌ ${e.message}</div>`;
        }
    },

    _render(data, container) {
        const intent = data.intent || {};
        const risk = data.risk_analysis || {};
        const category = intent.category || 'Other';
        const urgency = (intent.urgency || 'Medium').toLowerCase();
        const confidence = typeof intent.confidence === 'number' ? Math.round(intent.confidence * 100) : 0;

        let html = `<div class="intake-result">
            <div class="card intake-summary">
                <div class="intake-summary-header">
                    <div>
                        <p class="eyebrow">Structured legal intake</p>
                        <h3>${this._escapeHtml(category)} • ${this._escapeHtml(intent.subcategory || 'General case')}</h3>
                    </div>
                    <div class="urgency-pill urgency-${urgency}">${(intent.urgency || 'Medium').toUpperCase()}</div>
                </div>
                <p class="summary-text">${this._escapeHtml(data.case_summary || 'No summary available.')}</p>
                <div class="intake-metrics">
                    <div class="metric-card"><span>Confidence</span><strong>${confidence}%</strong></div>
                    <div class="metric-card"><span>Risk</span><strong>${this._escapeHtml(risk.overall_risk || 'medium')}</strong></div>
                </div>
            </div>`;

        html += `<div class="intake-grid">`;
        html += this._card('Facts we heard', this._list(data.facts ? [
            ...(data.facts.people_involved || []).map((item) => `People involved: ${item}`),
            ...(data.facts.important_dates || []).map((item) => `Important date: ${item}`),
            ...(data.facts.money_involved || []).map((item) => `Money: ${item}`),
            ...(data.facts.documents_mentioned || []).map((item) => `Document: ${item}`),
        ] : []));
        html += this._card('Missing info', this._list(data.missing_information || []));
        html += this._card('Evidence to collect', this._list(data.evidence_to_collect || []));
        html += this._card('Helpful questions', this._list(data.helpful_questions || []));
        html += `</div>`;

        if (risk.immediate_risks && risk.immediate_risks.length) {
            html += `<div class="card intake-banner danger"><h4>Immediate risks</h4>${this._list(risk.immediate_risks)}</div>`;
        }

        if (data.likely_paths && data.likely_paths.length) {
            html += '<div class="section-heading"><h3>Best next paths</h3></div><div class="path-card-grid">';
            for (const path of data.likely_paths) {
                html += `<div class="card path-mini-card">
                    <h4>${this._escapeHtml(path.path || 'Next step')}</h4>
                    <p>${this._escapeHtml(path.why || '')}</p>
                    <span class="path-timeline">${this._escapeHtml(path.when || '')}</span>
                </div>`;
            }
            html += '</div>';
        }

        html += `<div class="card intake-actions">
            <h4>Continue with this case</h4>
            <p>Use the same case text in chat, pathway planning, or draft generation.</p>
            <div class="action-row">
                <button class="btn btn-secondary btn-sm" onclick="NyaySetu.Intake.sendToChat()">💬 Open Chat</button>
                <button class="btn btn-secondary btn-sm" onclick="NyaySetu.Intake.sendToPathway()">🗺️ Open Pathway</button>
                <button class="btn btn-primary btn-sm" onclick="NyaySetu.Intake.sendToDraft()">✍️ Draft It</button>
            </div>
        </div>`;

        html += `<p class="disclaimer-line">⚖️ ${this._escapeHtml(data.disclaimer || 'This is AI guidance, not legal advice.')}</p>`;
        html += `</div>`;

        container.innerHTML = html;
    },

    sendToChat() {
        if (!this.lastResult) return;
        NyaySetu.App.navigate('chat');
        const input = document.getElementById('chatInput');
        if (input) input.value = this.lastResult.text;
    },

    sendToPathway() {
        if (!this.lastResult) return;
        NyaySetu.App.navigate('pathway');
        const input = document.getElementById('pathwayInput');
        if (input) input.value = this.lastResult.text;
    },

    sendToDraft() {
        if (!this.lastResult) return;
        const category = (this.lastResult.data?.intent?.category || '').toLowerCase();
        let draftType = 'legal_notice';
        if (category.includes('housing')) draftType = 'tenant_notice';
        else if (category.includes('employment')) draftType = 'workplace_complaint';
        else if (category.includes('consumer')) draftType = 'consumer_complaint';
        NyaySetu.App.navigate('drafts');
        NyaySetu.Drafts.setType(draftType);
        const input = document.getElementById('draftDetails');
        if (input) input.value = this.lastResult.text;
    },

    _card(title, content) {
        return `<div class="card intake-subcard"><h4>${title}</h4>${content}</div>`;
    },

    _list(items) {
        if (!items || !items.length) {
            return '<p class="muted-note">No items detected yet.</p>';
        }
        return `<ul class="compact-list">${items.map((item) => `<li>${this._escapeHtml(item)}</li>`).join('')}</ul>`;
    },

    _escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};
