/* NyaySetu Drafts - Stitch Light Theme */
window.NyaySetu = window.NyaySetu || {};
NyaySetu.Drafts = {
    selectedType: null, _draftText: '',
    selectType(el) {
        document.querySelectorAll('#draftTypes button').forEach(c => { c.classList.remove('ring-2','ring-primary','bg-primary/5'); });
        el.classList.add('ring-2','ring-primary','bg-primary/5');
        this.selectedType = el.dataset.type;
        document.getElementById('draftForm').classList.remove('hidden');
        document.getElementById('draftOutput').innerHTML = '';
    },
    generate() {
        if (!this.selectedType) { NyaySetu.App.toast('Select a draft type first.','error'); return; }
        const details = document.getElementById('draftDetails').value.trim();
        if (!details || details.length < 10) { NyaySetu.App.toast('Describe your situation in more detail.','error'); return; }
        const output = document.getElementById('draftOutput');
        output.innerHTML = '<div class="spinner"></div><p class="text-center text-on-surface-variant text-sm">Generating draft...</p>';
        let full = '';
        NyaySetu.API.streamPost('/draft', {draft_type:this.selectedType, details, language:NyaySetu.I18n.current},
            (chunk) => { full += chunk; output.innerHTML = '<div class="mt-6"><div class="draft-paper">'+this._esc(full)+'</div><div class="flex gap-3 mt-4"><button class="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors border border-primary/20" onclick="NyaySetu.Drafts.copy()"><span class="material-symbols-outlined text-[16px] align-middle mr-1">content_copy</span>Copy</button><button class="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors border border-outline-variant/20" onclick="NyaySetu.Drafts.download()"><span class="material-symbols-outlined text-[16px] align-middle mr-1">download</span>Download</button></div></div>'; },
            () => { this._draftText = full; },
            (err) => { output.innerHTML = '<div class="glass-card rounded-xl p-6 mt-6 border-l-4 border-error"><p class="text-error">'+err+'</p></div>'; }
        );
    },
    _esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); },
    copy() { navigator.clipboard.writeText(this._draftText).then(()=>NyaySetu.App.toast('Copied to clipboard!','success')); },
    download() { const b=new Blob([this._draftText],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='NyaySetu_'+this.selectedType+'.txt'; a.click(); }
};
