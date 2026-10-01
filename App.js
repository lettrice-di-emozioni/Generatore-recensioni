document.addEventListener('DOMContentLoaded', () => {
    // Archivio locale delle bozze: resta su questo browser/dispositivo.
    const ARCHIVE_KEY = 'schedeRecensioni.archive.v1';
    const FIELD_IDS = ['bookTitle', 'bookAuthor', 'bookGenre', 'formato', 'bookStatus', 'bookRating', 'bookMood', 'bookPitch', 'strengths', 'weaknesses', 'themes', 'keyQuote', 'targetAudience', 'customTags'];
    let editingDraftId = null;
    let autosaveTimer = null;

    const getArchive = () => {
        try {
            const value = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error('Impossibile leggere l’archivio locale:', error);
            return [];
        }
    };
    const setArchive = (items) => {
        try {
            localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items));
            return true;
        } catch (error) {
            console.error('Impossibile salvare l’archivio locale:', error);
            alert('Non riesco a salvare la bozza in questo browser. Controlla lo spazio disponibile o le impostazioni di archiviazione.');
            return false;
        }
    };
    const getField = (id) => (document.getElementById(id)?.value || '').trim();
    const readForm = () => {
        const data = {};
        FIELD_IDS.forEach(id => { data[id] = document.getElementById(id)?.value || ''; });
        data.selectedTags = [...document.querySelectorAll('.tag-pill.selected, .tag-chip.selected')]
            .map(element => element.dataset.tag || element.textContent.trim());
        return data;
    };
    const writeForm = (data = {}) => {
        FIELD_IDS.forEach(id => {
            const element = document.getElementById(id);
            if (element && data[id] !== undefined) element.value = data[id];
        });
        const selected = new Set(data.selectedTags || []);
        document.querySelectorAll('.tag-pill, .tag-chip').forEach(element => {
            const tag = element.dataset.tag || element.textContent.trim();
            element.classList.toggle('selected', selected.has(tag));
            if (element.classList.contains('tag-pill')) {
                element.style.background = selected.has(tag) ? '#6b46c1' : '#faf6f0';
                element.style.color = selected.has(tag) ? '#fff' : '#444';
                element.style.borderColor = selected.has(tag) ? '#6b46c1' : '#e2d9ce';
            }
        });
        updateEditorState();
    };
    const makeId = () => (window.crypto?.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const dateLabel = (value) => {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('it-IT');
    };
    const archiveList = document.getElementById('draftArchiveList');
    const archiveCount = document.getElementById('draftArchiveCount');
    const editorStatus = document.getElementById('draftEditorStatus');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const newDraftBtn = document.getElementById('newDraftBtn');
    const obsidianBtn = document.getElementById('sendObsidianBtn');

    function updateEditorState() {
        if (editorStatus) editorStatus.textContent = editingDraftId
            ? `✏️ Stai modificando una bozza${getField('bookTitle') ? `: ${getField('bookTitle')}` : ''}`
            : 'Nuova scheda: salvala come bozza per ritrovarla qui.';
        if (obsidianBtn) {
            const record = editingDraftId && getArchive().find(item => item.id === editingDraftId);
            obsidianBtn.textContent = record?.publishedAt ? '🔄 Aggiorna la nota in Obsidian' : '📝 Formatta e Invia a Obsidian';
        }
    }

    function renderArchive() {
        if (!archiveList) return;
        const items = getArchive().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        if (archiveCount) archiveCount.textContent = String(items.length);
        archiveList.replaceChildren();
        if (!items.length) {
            const empty = document.createElement('p');
            empty.className = 'draft-empty';
            empty.textContent = 'Le tue bozze salvate appariranno qui.';
            archiveList.append(empty);
            return;
        }
        items.forEach(item => {
            const card = document.createElement('article');
            card.className = 'draft-item';
            const info = document.createElement('div');
            info.className = 'draft-info';
            const title = document.createElement('strong');
            title.textContent = item.data?.bookTitle || 'Libro senza titolo';
            const detail = document.createElement('span');
            const meta = [item.data?.bookAuthor, item.data?.bookGenre].filter(Boolean).join(' · ');
            detail.textContent = [meta, item.data?.bookStatus || 'Bozza', item.publishedAt ? 'Nota Obsidian collegata' : 'Non pubblicata'].filter(Boolean).join(' · ');
            info.append(title, detail);
            const date = document.createElement('small');
            date.textContent = `Salvata ${dateLabel(item.updatedAt)}`;
            info.append(date);
            const actions = document.createElement('div');
            actions.className = 'draft-actions';
            const open = document.createElement('button');
            open.type = 'button'; open.textContent = 'Apri'; open.dataset.action = 'open'; open.dataset.id = item.id;
            const remove = document.createElement('button');
            remove.type = 'button'; remove.textContent = 'Elimina'; remove.dataset.action = 'delete'; remove.dataset.id = item.id;
            actions.append(open, remove); card.append(info, actions); archiveList.append(card);
        });
    }

    function saveDraft({quiet = false} = {}) {
        const data = readForm();
        if (!data.bookTitle.trim()) {
            if (!quiet) alert('Inserisci almeno il titolo del libro prima di salvare la bozza.');
            return null;
        }
        const items = getArchive();
        const existingIndex = items.findIndex(item => item.id === editingDraftId);
        const existing = existingIndex >= 0 ? items[existingIndex] : null;
        const now = new Date().toISOString();
        const record = {
            ...(existing || {}),
            id: existing?.id || makeId(),
            data,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        };
        if (existingIndex >= 0) items[existingIndex] = record;
        else items.unshift(record);
        if (!setArchive(items)) return null;
        editingDraftId = record.id;
        renderArchive(); updateEditorState();
        if (!quiet && saveDraftBtn) {
            const oldText = saveDraftBtn.textContent;
            saveDraftBtn.textContent = '✅ Bozza salvata';
            window.setTimeout(() => { saveDraftBtn.textContent = oldText; }, 1800);
        }
        return record;
    }

    function loadDraft(id) {
        const item = getArchive().find(record => record.id === id);
        if (!item) return;
        editingDraftId = item.id;
        writeForm(item.data || {});
        window.scrollTo({top: 0, behavior: 'smooth'});
        renderArchive();
    }

    function buildMarkdown(data) {
        const value = (id) => String(data[id] || '').trim();
        const lines = (text) => text.split(/\n+/).map(line => line.trim()).filter(Boolean);
        const yamlScalar = (text) => JSON.stringify(text || '');
        const yamlPropertyList = (key, values) => values.length
            ? `${key}:\n${values.map(item => `  - ${yamlScalar(item)}`).join('\n')}`
            : `${key}: []`;
        const displayList = (values, fallback) => values.length ? values.map(line => `• ${line}`).join('\n') : fallback;
        const bookTitle = value('bookTitle') || 'Recensione senza titolo';
        const author = value('bookAuthor');
        const title = author ? `${bookTitle} - ${author}` : bookTitle;
        const genre = value('bookGenre'), format = value('formato'), status = value('bookStatus');
        const rating = value('bookRating'), mood = value('bookMood'), pitch = value('bookPitch');
        const strengths = lines(value('strengths')), weaknesses = lines(value('weaknesses'));
        const themes = value('themes'), quote = value('keyQuote'), audience = value('targetAudience');
        const tags = [...new Set([...(data.selectedTags || []), ...value('customTags').split(/\s+/)]
            .map(tag => tag.replace(/^#+/, '').trim()).filter(Boolean))];
        const now = new Date();
        const noteDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const properties = [
            '---', `title: ${yamlScalar(bookTitle)}`, `author: ${yamlScalar(author)}`,
            `genre: ${yamlScalar(genre)}`, `format: ${yamlScalar(format)}`,
            `rating: ${yamlScalar(rating || 'N/D')}`, `date: ${noteDate}`,
            yamlPropertyList('tags', tags), '---',
        ].join('\n');
        const body = [
            `# ${title}`, '', `> **In una frase:** ${pitch || 'Da completare'}`, '',
            `• **Genere:** ${genre || '—'}`, `• **Formato:** ${format || '—'}`,
            `• **Stato:** ${status || '—'}`, `• **Valutazione:** ${rating || 'N/D'}`,
            `• **Mood / Emotività:** ${mood || '—'}`, '', '---', '',
            '## 💡 Punti di Forza', displayList(strengths, 'Nessun punto inserito.'), '',
            '## ⚠️ Punti Deboli / Note', displayList(weaknesses, 'Nessun punto debole evidenziato.'), '',
            '## 🔑 Temi e Personaggi Chiave', themes || 'Da completare.', '',
            '## 💬 Citazione Simbolo', quote ? lines(quote).map(line => `> ${line}`).join('\n') : 'Da completare.', '',
            '## 🎯 A chi lo consiglio', audience || 'Da completare.',
            ...(tags.length ? ['', '## 🏷️ Tag', '', tags.map(tag => `#${tag}`).join(' ')] : []), '',
        ].join('\n');
        return {markdown: `${properties}\n\n${body}`, bookTitle, title};
    }

    saveDraftBtn?.addEventListener('click', () => saveDraft());
    newDraftBtn?.addEventListener('click', () => {
        if (FIELD_IDS.some(id => getField(id)) && !window.confirm('Aprire una nuova scheda? I dati non salvati non verranno conservati.')) return;
        editingDraftId = null;
        writeForm({formato: 'Cartaceo', bookStatus: 'In Lettura'});
        FIELD_IDS.forEach(id => { const element = document.getElementById(id); if (element) element.value = ''; });
        renderArchive(); updateEditorState(); window.scrollTo({top: 0, behavior: 'smooth'});
    });
    archiveList?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        if (button.dataset.action === 'open') loadDraft(button.dataset.id);
        if (button.dataset.action === 'delete') {
            const item = getArchive().find(record => record.id === button.dataset.id);
            if (!item || !window.confirm(`Eliminare la bozza “${item.data?.bookTitle || 'senza titolo'}” dall’archivio di questo dispositivo?`)) return;
            if (setArchive(getArchive().filter(record => record.id !== item.id))) {
                if (editingDraftId === item.id) { editingDraftId = null; updateEditorState(); }
                renderArchive();
            }
        }
    });
    document.querySelectorAll('.tag-pill, .tag-chip').forEach(button => button.addEventListener('click', () => {
        button.classList.toggle('selected');
        if (button.classList.contains('tag-pill')) {
            const selected = button.classList.contains('selected');
            button.style.background = selected ? '#6b46c1' : '#faf6f0';
            button.style.color = selected ? '#fff' : '#444';
            button.style.borderColor = selected ? '#6b46c1' : '#e2d9ce';
        }
        scheduleAutosave();
    }));
    function scheduleAutosave() {
        if (!editingDraftId) return;
        window.clearTimeout(autosaveTimer);
        autosaveTimer = window.setTimeout(() => saveDraft({quiet: true}), 600);
    }
    FIELD_IDS.forEach(id => {
        const element = document.getElementById(id);
        element?.addEventListener('input', scheduleAutosave);
        element?.addEventListener('change', scheduleAutosave);
    });
    renderArchive(); updateEditorState();

    // Genera la scheda e apre la nota Obsidian. Le bozze già pubblicate conservano
    // il nome file originale; overwrite aggiorna quella nota invece di crearne una copia.
    obsidianBtn?.addEventListener('click', () => {
        const saved = saveDraft({quiet: true});
        if (!saved) { alert('Inserisci almeno il titolo del libro prima di inviare la scheda.'); return; }
        const {markdown, bookTitle, title} = buildMarkdown(saved.data);
        const output = document.getElementById('outputArea');
        if (output) output.value = markdown;
        const items = getArchive();
        const index = items.findIndex(item => item.id === saved.id);
        const current = items[index];
        const noteName = current.obsidianName || title;
        const updatingExisting = Boolean(current.publishedAt && current.obsidianName);
        const query = new URLSearchParams({name: noteName, content: markdown});
        if (updatingExisting) query.set('overwrite', 'true');
        const obsidianUrl = `obsidian://new?${query.toString()}`;
        current.obsidianName = noteName;
        current.publishedAt = new Date().toISOString();
        items[index] = current;
        if (!setArchive(items)) return;
        renderArchive(); updateEditorState();
        let copied = false;
        const copyPromise = navigator.clipboard?.writeText(markdown)
            .then(() => { copied = true; }).catch(() => {});
        window.location.href = obsidianUrl;
        Promise.resolve(copyPromise).then(() => {
            obsidianBtn.textContent = copied
                ? (updatingExisting ? '✅ Nota aggiornata in Obsidian' : '✅ Nota inviata a Obsidian')
                : '📝 Nota pronta: copia il testo qui sotto';
            window.setTimeout(updateEditorState, 3500);
        });
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Riconoscimento vocale non supportato.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.continuous = false;

    let isListening = false;
    let micPermissionGranted = false;
    let currentTargetField = null;
    let isGlobalMode = false;

    // Forza il popup dei permessi
    async function requestMicAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            micPermissionGranted = true;
            return true;
        } catch (e) {
            alert("Devi consentire l'accesso al microfono per usare la dettatura.");
            return false;
        }
    }

    // 1. GESTIONE DEI SINGOLI MICROFONI SUI CAMPI (.field-voice-btn)
    const fieldBtns = document.querySelectorAll('.field-voice-btn');
    fieldBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (isListening) {
                recognition.stop();
                return;
            }

            const targetId = btn.getAttribute('data-target');
            currentTargetField = document.getElementById(targetId);
            isGlobalMode = false;

            if (!currentTargetField) return;

            if (!micPermissionGranted) {
                const ok = await requestMicAccess();
                if (!ok) return;
            }

            try {
                recognition.start();
            } catch (err) {
                console.error(err);
            }
        });
    });

    // 2. GESTIONE DETTATURA SMART GLOBALE (#globalDictationBtn)
    const globalBtn = document.getElementById('globalDictationBtn');
    if (globalBtn) {
        globalBtn.addEventListener('click', async () => {
            if (isListening) {
                recognition.stop();
                return;
            }

            isGlobalMode = true;
            currentTargetField = null;

            if (!micPermissionGranted) {
                const ok = await requestMicAccess();
                if (!ok) return;
            }

            try {
                recognition.start();
            } catch (err) {
                console.error(err);
            }
        });
    }

    recognition.onstart = () => {
        isListening = true;
        if (isGlobalMode && globalBtn) {
            globalBtn.innerText = "Ascolto in corso... Parla!";
            globalBtn.style.background = "#ef4444";
            globalBtn.style.color = "#fff";
        }
    };

    // 3. RICEZIONE DEL TESTO PARLATO
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;

        // Se è la dettatura globale, analizza le parole chiave
        if (isGlobalMode) {
            parseGlobalDictation(text);
        } else if (currentTargetField) {
            // Se è un singolo campo, scrive direttamente lì
            currentTargetField.value = currentTargetField.value 
                ? `${currentTargetField.value} ${text}` 
                : text;
        }
    };

    recognition.onerror = (e) => {
        console.error("Errore riconoscimento:", e.error);
        resetState();
    };

    recognition.onend = () => {
        resetState();
    };

    function resetState() {
        isListening = false;
        if (globalBtn) {
            globalBtn.innerText = "Avvia Dettatura Globale";
            globalBtn.style.background = "white";
            globalBtn.style.color = "#7c3aed";
        }
    }

    // Funzione intelligente per la dettatura globale
    function parseGlobalDictation(sentence) {
        const lower = sentence.toLowerCase();

        // Esempio: riempie il campo in base alla parola pronunciata
        if (lower.startsWith('titolo')) {
            document.getElementById('bookTitle').value = sentence.replace(/titolo/i, '').trim();
        } else if (lower.startsWith('autore')) {
            document.getElementById('bookAuthor').value = sentence.replace(/autore/i, '').trim();
        } else if (lower.startsWith('genere')) {
            document.getElementById('bookGenre').value = sentence.replace(/genere/i, '').trim();
        } else if (lower.startsWith('citazione')) {
            document.getElementById('keyQuote').value = sentence.replace(/citazione/i, '').trim();
        } else if (lower.startsWith('punti di forza')) {
            document.getElementById('strengths').value = sentence.replace(/punti di forza/i, '').trim();
        } else {
            // Se non trova parole chiave, lo inserisce nelle note/pitch
            const pitch = document.getElementById('bookPitch');
            if (pitch) pitch.value = sentence;
        }
    }
});
            
