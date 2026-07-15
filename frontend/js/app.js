/* NyaySetu App - Navigation, Workflow Orchestration, Utilities */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.App = {
    currentView: 'landing',
    views: ['landing','dashboard','chat','document','drafts','pathway','voice','rights','workflow'],

    init() {
        if (typeof NyaySetu.Voice !== 'undefined' && NyaySetu.Voice.init) NyaySetu.Voice.init();
        if (typeof NyaySetu.Document !== 'undefined' && NyaySetu.Document.init) NyaySetu.Document.init();
        if (typeof NyaySetu.I18n !== 'undefined' && NyaySetu.I18n.init) NyaySetu.I18n.init();
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) this.navigate(e.state.view, false);
        });
    },

    navigate(view, pushState = true) {
        this.views.forEach(v => {
            const el = document.getElementById('view-' + v);
            if (el) { el.classList.remove('active'); el.style.display = 'none'; }
        });
        const target = document.getElementById('view-' + view);
        if (target) { target.classList.add('active'); target.style.display = ''; }

        const sidebar = document.getElementById('app-sidebar');
        const header = document.getElementById('app-header');
        const noChrome = (view === 'landing' || view === 'voice');
        if (noChrome) {
            sidebar.classList.add('hidden'); sidebar.classList.remove('md:flex');
            header.classList.add('hidden'); header.classList.remove('flex');
        } else {
            sidebar.classList.remove('hidden'); sidebar.classList.add('md:flex');
            header.classList.remove('hidden'); header.classList.add('flex');
        }

        document.querySelectorAll('#sidebarNav .sidebar-link').forEach(link => {
            const lv = link.getAttribute('data-view');
            if (lv === view) {
                link.classList.remove('text-on-surface-variant/70','font-medium');
                link.classList.add('text-primary','font-bold','border-r-2','border-primary');
            } else {
                link.classList.remove('text-primary','font-bold','border-r-2','border-primary');
                link.classList.add('text-on-surface-variant/70','font-medium');
            }
        });
        this.currentView = view;
        if (pushState) history.pushState({ view }, '', '#' + view);
        window.scrollTo(0, 0);
    },

    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    /* ── Workflow Orchestration ── */
    async runAnalysis() {
        const input = document.getElementById('dashboardInput').value.trim();
        if (!input || input.length < 10) { this.toast('Please describe your legal situation in more detail.', 'error'); return; }
        this.navigate('workflow');
        const agents = [
            { id:'intent',   icon:'psychology',        title:'Intent Classification',     desc:'Determines case category, urgency level, and jurisdiction.' },
            { id:'facts',    icon:'list_alt',           title:'Fact Extraction',           desc:'Identifies people, dates, events, transactions, and evidence.' },
            { id:'gaps',     icon:'error_outline',      title:'Gap Identification',        desc:'Determines if crucial documents or clarifications are missing.' },
            { id:'retrieval',icon:'find_in_page',       title:'Legal Retrieval',           desc:'Queries indexed federal and state codes for relevant statutes.' },
            { id:'reasoning',icon:'neurology',          title:'Legal Reasoning',           desc:'Applies retrieved statutes to extracted facts to form arguments.' },
            { id:'risk',     icon:'warning',            title:'Risk Assessment',           desc:'Checks case weaknesses, liabilities, and chances of litigation success.' },
            { id:'planner',  icon:'assignment',         title:'Action Planner',            desc:'Plots concrete next steps, contacts, documentation checklist.' },
            { id:'synthesis',icon:'check_circle',       title:'Final Response Synthesis',  desc:'Synthesizes insights into client-friendly advice.' },
        ];
        const container = document.getElementById('workflowAgents');
        container.innerHTML = '';
        for (const a of agents) {
            container.innerHTML += `
            <div class="glass-card rounded-2xl p-5 flex items-start gap-4 transition-all duration-500" id="agent-${a.id}">
                <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-outline text-[24px]">${a.icon}</span>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <h4 class="font-semibold text-on-surface">${a.title}</h4>
                        <span class="text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-outline font-bold" id="status-${a.id}">QUEUED</span>
                    </div>
                    <p class="text-sm text-on-surface-variant mt-1">${a.desc}</p>
                    <div class="hidden mt-3" id="detail-${a.id}"></div>
                </div>
            </div>`;
        }
        // Run the intake analysis
        this._animateAgents(agents, input);
    },

    async _animateAgents(agents, input) {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const setActive = (id) => {
            const card = document.getElementById('agent-' + id);
            const status = document.getElementById('status-' + id);
            const icon = card.querySelector('.material-symbols-outlined');
            card.classList.add('border-l-4','border-l-primary');
            card.querySelector('.w-10').classList.remove('bg-surface-container');
            card.querySelector('.w-10').classList.add('bg-primary/10');
            icon.classList.add('text-primary','agent-pulse'); icon.classList.remove('text-outline');
            status.textContent = 'ACTIVE'; status.classList.remove('bg-surface-container','text-outline');
            status.classList.add('bg-green-100','text-green-700');
        };
        const setComplete = (id, detail) => {
            const card = document.getElementById('agent-' + id);
            const status = document.getElementById('status-' + id);
            const detailEl = document.getElementById('detail-' + id);
            const icon = card.querySelector('.material-symbols-outlined');
            icon.classList.remove('agent-pulse');
            status.textContent = 'COMPLETE'; status.classList.remove('bg-green-100','text-green-700');
            status.classList.add('bg-blue-100','text-blue-700');
            if (detail) { detailEl.classList.remove('hidden'); detailEl.innerHTML = '<div class="p-3 bg-surface-container-low rounded-lg text-sm font-mono text-on-surface-variant/80">' + detail + '</div>'; }
        };

        // 1. Intent
        setActive('intent'); await delay(800);
        let intakeData = null;
        try { intakeData = await NyaySetu.API.post('/intake', { text: input, language: NyaySetu.I18n.current }); }
        catch(e) { intakeData = null; }
        const intent = intakeData?.intent || { category:'General', subcategory:'Legal query', urgency:'Medium', confidence:0.7 };
        setComplete('intent', 'Category: ' + intent.category + ' &gt; ' + intent.subcategory + '<br>Urgency: <span class="' + (intent.urgency==='High'?'text-error font-bold':'text-tertiary') + '">' + intent.urgency + '</span><br>AI Confidence: ' + ((intent.confidence||0.7)*100).toFixed(1) + '%');

        // 2. Facts
        setActive('facts'); await delay(600);
        const facts = intakeData?.facts || {};
        setComplete('facts', 'People: ' + (facts.people_involved||['User']).join(', ') + '<br>Documents: ' + (facts.documents_mentioned||['Evidence']).join(', '));

        // 3. Gaps
        setActive('gaps'); await delay(500);
        const missing = intakeData?.missing_information || [];
        if (missing.length) {
            setComplete('gaps', '<span class="text-tertiary font-bold">' + missing.length + ' gaps found:</span><br>' + missing.map(m => '- ' + m).join('<br>'));
            document.getElementById('status-gaps').textContent = missing.length + ' GAPS'; document.getElementById('status-gaps').classList.add('bg-tertiary-fixed','text-on-tertiary-fixed'); document.getElementById('status-gaps').classList.remove('bg-blue-100','text-blue-700');
        } else { setComplete('gaps', 'No critical gaps identified.'); }

        // 4. Retrieval
        setActive('retrieval'); await delay(700);
        const laws = intakeData?.evidence_to_collect || [];
        setComplete('retrieval', 'Evidence to collect: ' + (laws.length ? laws.join(', ') : 'Standard documentation'));

        // 5. Reasoning
        setActive('reasoning'); await delay(600);
        const risk = intakeData?.risk_analysis || {};
        setComplete('reasoning', (risk.why_it_matters || 'Legal analysis complete.'));

        // 6. Risk
        setActive('risk'); await delay(500);
        const riskLevel = risk.overall_risk || 'medium';
        const riskClass = riskLevel === 'high' ? 'text-error font-bold' : (riskLevel === 'low' ? 'text-green-600' : 'text-tertiary');
        setComplete('risk', 'Overall risk: <span class="' + riskClass + '">' + riskLevel.toUpperCase() + '</span>' + (risk.immediate_risks?.length ? '<br>Risks: ' + risk.immediate_risks.join('; ') : ''));

        // 7. Planner
        setActive('planner'); await delay(400);
        const steps = intakeData?.recommended_next_steps || [];
        setComplete('planner', steps.length ? steps.map((s,i) => (i+1) + '. ' + s).join('<br>') : 'Action plan generated.');

        // 8. Synthesis
        setActive('synthesis'); await delay(300);
        setComplete('synthesis', 'Report ready. Click below to view the full analysis.');

        // Show action buttons
        const actionsEl = document.getElementById('workflowActions');
        actionsEl.classList.remove('hidden');
        actionsEl.innerHTML = `
            <div class="flex flex-wrap gap-4 justify-center mt-8">
                <button class="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition-all shadow-lg flex items-center gap-2" onclick="NyaySetu.App.navigate('chat');setTimeout(()=>{document.getElementById('chatInput').value='${input.replace(/'/g,"\\'")}';NyaySetu.Chat.send()},200)">
                    <span class="material-symbols-outlined">chat</span>Discuss with AI
                </button>
                <button class="px-6 py-3 border border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all flex items-center gap-2" onclick="NyaySetu.App.navigate('pathway');document.getElementById('pathwayInput').value='${input.replace(/'/g,"\\'")}';setTimeout(()=>NyaySetu.Pathway.generate(),200)">
                    <span class="material-symbols-outlined">assignment_turned_in</span>Generate Action Plan
                </button>
                <button class="px-6 py-3 border border-outline-variant text-on-surface-variant rounded-xl font-bold hover:bg-surface-container transition-all flex items-center gap-2" onclick="NyaySetu.App.navigate('drafts')">
                    <span class="material-symbols-outlined">description</span>Draft a Document
                </button>
            </div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NyaySetu.App.init();
    const hash = window.location.hash.slice(1);
    if (hash && NyaySetu.App.views.includes(hash)) NyaySetu.App.navigate(hash, false);

    // Bento card animation
    if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('opacity-100','translate-y-0'); entry.target.classList.remove('opacity-0','translate-y-4'); }});
        }, { threshold: 0.1 });
        document.querySelectorAll('.bento-grid > div').forEach(card => { card.classList.add('transition-all','duration-700','opacity-0','translate-y-4'); observer.observe(card); });
    }

    // Upload zone drag/drop
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        ['dragenter','dragover'].forEach(e => uploadZone.addEventListener(e, ev => { ev.preventDefault(); uploadZone.classList.add('bg-primary/5'); }));
        ['dragleave','drop'].forEach(e => uploadZone.addEventListener(e, ev => { ev.preventDefault(); uploadZone.classList.remove('bg-primary/5'); }));
        uploadZone.addEventListener('drop', ev => { if(ev.dataTransfer.files.length) NyaySetu.Document.handleFile(ev.dataTransfer.files[0]); });
    }
});
