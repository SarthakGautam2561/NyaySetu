/* NyaySetu Pathway - Stitch Light Theme */
window.NyaySetu = window.NyaySetu || {};
NyaySetu.Pathway = {
    async generate() {
        const input = document.getElementById('pathwayInput').value.trim();
        if (!input || input.length < 10) { NyaySetu.App.toast('Describe your situation in more detail.','error'); return; }
        const r = document.getElementById('pathwayResult');
        r.innerHTML = '<div class="spinner"></div><p class="text-center text-on-surface-variant text-sm">Planning your legal pathway...</p>';
        try { const data = await NyaySetu.API.post('/pathway',{situation:input,language:NyaySetu.I18n.current}); this._render(data,r); }
        catch(e) { r.innerHTML = '<div class="glass-card rounded-xl p-6 mt-6 border-l-4 border-error"><p class="text-error">'+e.message+'</p></div>'; }
    },
    _render(data, el) {
        let h = '<div class="mt-8 space-y-6 animate-fadeIn">';
        if (data.situation_summary) h += '<div class="glass-card rounded-xl p-6"><h4 class="font-semibold text-on-surface mb-2">Situation Summary</h4><p class="text-on-surface-variant">'+data.situation_summary+'</p></div>';
        if (data.applicable_laws?.length) { h += '<div class="flex gap-2 flex-wrap">'; for(const l of data.applicable_laws) h += '<span class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-label-sm">'+l+'</span>'; h += '</div>'; }
        if (data.steps?.length) {
            h += '<div class="timeline-line">';
            for (const s of data.steps) h += '<div class="timeline-step"><div class="glass-card rounded-xl p-5 ml-2"><div class="flex items-center justify-between mb-2 flex-wrap gap-2"><h4 class="font-semibold text-on-surface">Step '+s.step_number+': '+s.title+'</h4><span class="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-label-sm">'+(s.timeline||'')+'</span></div><p class="text-on-surface-variant text-sm mb-3">'+(s.description||'')+'</p><div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">'+(s.authority?'<div class="text-on-surface-variant"><span class="text-on-surface font-semibold">Where:</span> '+s.authority+'</div>':'')+(s.estimated_cost?'<div class="text-on-surface-variant"><span class="text-on-surface font-semibold">Cost:</span> '+s.estimated_cost+'</div>':'')+(s.documents_needed?.length?'<div class="text-on-surface-variant"><span class="text-on-surface font-semibold">Docs:</span> '+s.documents_needed.join(', ')+'</div>':'')+(s.tips?'<div class="text-on-surface-variant"><span class="text-on-surface font-semibold">Tip:</span> '+s.tips+'</div>':'')+'</div></div></div>';
            h += '</div>';
        }
        if (data.total_timeline||data.total_cost_estimate) h += '<div class="glass-card rounded-xl p-6 flex gap-8 flex-wrap">'+(data.total_timeline?'<div><span class="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Time</span><p class="text-lg font-bold text-on-surface mt-1">'+data.total_timeline+'</p></div>':'')+(data.total_cost_estimate?'<div><span class="text-label-sm text-on-surface-variant uppercase tracking-wider">Est. Cost</span><p class="text-lg font-bold text-on-surface mt-1">'+data.total_cost_estimate+'</p></div>':'')+'</div>';
        if (data.when_to_get_lawyer) h += '<div class="glass-card rounded-xl p-6 border-l-4 border-tertiary"><h4 class="font-semibold text-tertiary mb-2">When to Get a Lawyer</h4><p class="text-on-surface-variant">'+data.when_to_get_lawyer+'</p></div>';
        h += '</div>'; el.innerHTML = h;
    }
};
