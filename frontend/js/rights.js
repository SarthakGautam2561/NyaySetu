/* NyaySetu Rights - Stitch Light Theme */
window.NyaySetu = window.NyaySetu || {};
NyaySetu.Rights = {
    selectedCategory: null,
    async selectCategory(el) {
        document.querySelectorAll('#rightsCategories button').forEach(c => { c.classList.remove('ring-2','ring-primary','bg-primary/5'); });
        el.classList.add('ring-2','ring-primary','bg-primary/5');
        this.selectedCategory = el.dataset.cat;
        const r = document.getElementById('rightsResult');
        r.innerHTML = '<div class="spinner"></div><p class="text-center text-on-surface-variant text-sm">Fetching your rights...</p>';
        try { const data = await NyaySetu.API.post('/rights',{category:this.selectedCategory,language:NyaySetu.I18n.current}); this._render(data,r); }
        catch(e) { r.innerHTML = '<div class="glass-card rounded-xl p-6 border-l-4 border-error"><p class="text-error">'+e.message+'</p></div>'; }
    },
    _render(data, el) {
        let h = '<div class="space-y-6 animate-fadeIn">';
        if (data.your_rights?.length) {
            h += '<h3 class="text-2xl font-bold text-on-surface border-b border-outline-variant/20 pb-4">Your Rights</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
            for (const r of data.your_rights) h += '<div class="glass-card rounded-xl p-6 space-y-3 hover:border-primary/30 transition-colors"><h4 class="text-xl font-semibold text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary">shield</span>'+r.right+'</h4>'+(r.legal_basis?'<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-600/10 border border-green-600/20 text-green-700 text-label-sm">'+r.legal_basis+'</div>':'')+'<p class="text-on-surface-variant text-sm leading-relaxed">'+(r.explanation||'')+'</p>'+(r.how_to_exercise?'<div class="bg-primary/5 border border-primary/10 rounded-lg p-3 text-primary text-sm font-medium">'+r.how_to_exercise+'</div>':'')+'</div>';
            h += '</div>';
        }
        if (data.common_violations?.length) {
            h += '<h3 class="text-xl font-bold text-on-surface mt-4">Common Violations</h3><div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';
            for(const v of data.common_violations) h += '<div class="glass-card rounded-xl p-5 text-on-surface-variant text-sm border-l-4 border-error/30">'+v+'</div>';
            h += '</div>';
        }
        if (data.helplines?.length) {
            h += '<div class="glass-card rounded-2xl p-8 bg-gradient-to-br from-primary/5 to-transparent"><h3 class="text-2xl font-bold text-on-surface mb-4">Need Help?</h3><div class="space-y-3">';
            for(const hp of data.helplines) h += '<div class="flex items-center justify-between gap-4 bg-white hover:bg-surface-container-low transition-colors border border-outline-variant/20 rounded-xl px-5 py-3"><span class="font-medium text-on-surface">'+hp.name+'</span><span class="font-bold text-primary tracking-wider text-lg">'+hp.number+'</span></div>';
            h += '</div></div>';
        }
        if (data.disclaimer) h += '<p class="text-center text-label-sm text-outline uppercase tracking-wider">'+data.disclaimer+'</p>';
        h += '</div>'; el.innerHTML = h;
    }
};
