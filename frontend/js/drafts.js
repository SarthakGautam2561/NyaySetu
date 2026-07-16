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
            (chunk) => {
                full += chunk;
                output.innerHTML = `
                <div class="mt-6">
                    <div class="draft-paper">${this._esc(full)}</div>
                    <div class="flex flex-wrap gap-3 mt-4">
                        <button class="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors border border-primary/20" onclick="NyaySetu.Drafts.copy()">
                            <span class="material-symbols-outlined text-[16px] align-middle mr-1">content_copy</span>Copy
                        </button>
                        <button class="px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-sm font-medium hover:bg-secondary/15 transition-colors border border-secondary/20" onclick="NyaySetu.Drafts.exportFile('pdf')">
                            <span class="material-symbols-outlined text-[16px] align-middle mr-1">picture_as_pdf</span>Export PDF
                        </button>
                        <button class="px-4 py-2 rounded-lg bg-tertiary/10 text-tertiary text-sm font-medium hover:bg-tertiary/15 transition-colors border border-tertiary/20" onclick="NyaySetu.Drafts.exportFile('docx')">
                            <span class="material-symbols-outlined text-[16px] align-middle mr-1">description</span>Export Word
                        </button>
                        <button class="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors border border-outline-variant/20" onclick="NyaySetu.Drafts.exportFile('txt')">
                            <span class="material-symbols-outlined text-[16px] align-middle mr-1">download</span>Plain Text
                        </button>
                    </div>
                </div>`;
            },
            () => { this._draftText = full; },
            (err) => { output.innerHTML = '<div class="glass-card rounded-xl p-6 mt-6 border-l-4 border-error"><p class="text-error">'+err+'</p></div>'; }
        );
    },
    _esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); },
    copy() { navigator.clipboard.writeText(this._draftText).then(()=>NyaySetu.App.toast('Copied to clipboard!','success')); },
    async exportFile(format) {
        if (!this._draftText) return;
        if (format === 'txt') {
            const b = new Blob([this._draftText], {type: 'text/plain'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = 'NyaySetu_' + this.selectedType + '.txt';
            a.click();
            return;
        }
        
        try {
            NyaySetu.App.toast('Generating document...', 'success');
            const res = await fetch(NyaySetu.API.BASE + '/draft/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: this._draftText,
                    format: format,
                    title: this.selectedType.replace(/_/g, ' ').toUpperCase()
                })
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'NyaySetu_' + this.selectedType + '.' + format;
            a.click();
        } catch (e) {
            NyaySetu.App.toast('Failed to export file: ' + e.message, 'error');
        }
    }
};
