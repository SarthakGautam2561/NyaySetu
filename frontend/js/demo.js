/* NyaySetu Demo Helpers */
window.NyaySetu = window.NyaySetu || {};

NyaySetu.Demo = {
    launch(view, value) {
        NyaySetu.App.navigate(view);

        if (view === 'chat') {
            const input = document.getElementById('chatInput');
            if (input) input.value = value || '';
            return;
        }

        if (view === 'pathway') {
            const input = document.getElementById('pathwayInput');
            if (input) input.value = value || '';
            return;
        }

        if (view === 'intake') {
            const input = document.getElementById('intakeInput');
            if (input) {
                input.value = value || '';
                input.focus();
            }
            return;
        }

        if (view === 'drafts') {
            NyaySetu.Drafts.setType(this._draftTypeFor(value || ''));
            const input = document.getElementById('draftDetails');
            if (input) input.value = value || '';
            return;
        }

        if (view === 'rights') {
            const cards = document.querySelectorAll('.rights-cat-card');
            const target = String(value || '').toLowerCase();
            cards.forEach((card) => {
                if (card.dataset.cat === target) card.click();
            });
        }
    },

    _draftTypeFor(text) {
        const lower = String(text).toLowerCase();
        if (lower.includes('landlord') || lower.includes('evict') || lower.includes('tenant')) return 'tenant_notice';
        if (lower.includes('salary') || lower.includes('employer') || lower.includes('work')) return 'workplace_complaint';
        if (lower.includes('refund') || lower.includes('consumer') || lower.includes('product')) return 'consumer_complaint';
        if (lower.includes('rti')) return 'rti_application';
        return 'legal_notice';
    }
};
