/* NyaySetu Document Analyzer - Stitch Light Theme */
window.NyaySetu = window.NyaySetu || {};
NyaySetu.Document = {
    init() {
        const zone = document.getElementById('uploadZone');
        if (!zone) return;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('bg-primary/5'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('bg-primary/5'));
        zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('bg-primary/5'); if(e.dataTransfer.files.length) this.handleFile(e.dataTransfer.files[0]); });
    },
    async handleFile(file) {
        if (!file) return;
        if (file.size > 10*1024*1024) { NyaySetu.App.toast('File too large. Max 10 MB.','error'); return; }
        const r = document.getElementById('analysisResult');
        r.innerHTML = '<div class="spinner"></div><p class="text-center text-on-surface-variant text-sm mt-2">Analyzing your document with AI...</p>';
        try { const data = await NyaySetu.API.uploadFile('/analyze', file, {language: NyaySetu.I18n.current}); this._render(data, r); }
        catch(e) { r.innerHTML = '<div class="glass-card rounded-xl p-6 mt-6 border-l-4 border-error"><p class="text-error">Error: '+e.message+'</p></div>'; }
    },
    _render(data, el) {
        const a = data.analysis, risk = (a.overall_risk||'medium').toLowerCase();
        const riskMap = {high:['error','Error'],medium:['tertiary','Warning'],low:['green-600','Safe']};
        const [rc] = riskMap[risk]||riskMap.medium;
        let h = '<div class="mt-8 space-y-6 animate-fadeIn">';
        h += '<div class="flex items-center justify-between flex-wrap gap-4"><div><h3 class="text-xl font-bold text-on-surface">'+data.filename+'</h3><p class="text-sm text-on-surface-variant">'+(a.document_type||'Document')+' &bull; '+(data.text_length/1000).toFixed(1)+'k chars</p></div>';
        h += '<div class="px-4 py-2 rounded-full bg-'+rc+'/10 border border-'+rc+'/20 text-'+rc+' text-label-sm uppercase tracking-wider font-bold">Risk: '+risk.toUpperCase()+'</div></div>';
        h += '<div class="glass-card rounded-xl p-6"><h4 class="font-semibold text-on-surface mb-2">Summary</h4><p class="text-on-surface-variant leading-relaxed">'+(a.summary||'No summary.')+'</p></div>';
        if (a.clauses?.length) {
            h += '<h4 class="text-lg font-bold text-on-surface">Clause Analysis</h4><div class="space-y-4">';
            for (const c of a.clauses) {
                const lv = (c.risk_level||'medium').toLowerCase();
                const lc = {high:'error',medium:'tertiary',low:'primary',favorable:'green-600'}[lv]||'outline';
                h += '<div class="glass-card rounded-xl p-5 clause-'+lv+'"><div class="flex items-center justify-between mb-2"><h4 class="font-semibold text-on-surface">'+(c.title||'Clause')+'</h4><span class="px-3 py-1 rounded-full bg-'+lc+'/10 border border-'+lc+'/20 text-'+lc+' text-label-sm uppercase">'+lv+'</span></div><p class="text-on-surface-variant text-sm leading-relaxed mb-2">'+(c.explanation||'')+'</p>'+(c.action_needed?'<div class="bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm text-primary font-medium">Action: '+c.action_needed+'</div>':'')+'</div>';
            }
            h += '</div>';
        }
        if (a.deadlines?.length) {
            h += '<h4 class="text-lg font-bold text-on-surface">Deadlines</h4><div class="space-y-3">';
            for (const d of a.deadlines) h += '<div class="glass-card rounded-xl p-4 flex items-center gap-4"><span class="font-bold text-tertiary whitespace-nowrap">'+d.date+'</span><div><strong class="text-on-surface">'+d.action+'</strong><p class="text-on-surface-variant text-xs mt-1">'+(d.consequence||'')+'</p></div></div>';
            h += '</div>';
        }
        if (a.recommended_actions?.length) {
            h += '<div class="glass-card rounded-xl p-6 border-l-4 border-green-600"><h4 class="font-semibold text-on-surface mb-3">Recommended Actions</h4><ol class="list-decimal pl-5 space-y-2">';
            for (const act of a.recommended_actions) h += '<li class="text-on-surface-variant">'+act+'</li>';
            h += '</ol></div>';
        }
        h += '<p class="text-center text-label-sm text-outline uppercase tracking-wider">'+(a.disclaimer||'AI analysis. Consult a qualified lawyer.')+'</p></div>';
        el.innerHTML = h;
    }
};
