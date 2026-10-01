document.addEventListener('DOMContentLoaded', () => {
    // Crea la nota Markdown, la copia negli appunti come fallback e apre Obsidian.
    const obsidianBtn = document.getElementById('sendObsidianBtn');
    if (obsidianBtn) {
        const field = (id) => (document.getElementById(id)?.value || '').trim();
        const lines = (text) => text.split(/\n+/).map(line => line.trim()).filter(Boolean);
        const yamlScalar = (value) => JSON.stringify(value || '');
        const yamlList = (values) => values.map(value => `  - ${yamlScalar(value)}`).join('\n');
        const yamlPropertyList = (key, values) => values.length
            ? `${key}:\n${yamlList(values)}`
            : `${key}: []`;
        const displayList = (values, fallback) => values.length
            ? values.map(value => `• ${value}`).join('\n')
            : fallback;

        obsidianBtn.addEventListener('click', () => {
            const bookTitle = field('bookTitle') || 'Recensione senza titolo';
            const author = field('bookAuthor');
            const title = author ? `${bookTitle} - ${author}` : bookTitle;
            const genre = field('bookGenre');
            const format = field('formato');
            const status = field('bookStatus');
            const rating = field('bookRating');
            const mood = field('bookMood');
            const pitch = field('bookPitch');
            const strengths = lines(field('strengths'));
            const weaknesses = lines(field('weaknesses'));
            const themes = field('themes');
            const quote = field('keyQuote');
            const audience = field('targetAudience');
            const selectedTags = [...document.querySelectorAll('.tag-pill.selected, .tag-chip.selected')]
                .map(element => element.dataset.tag || element.textContent.trim());
            const customTags = field('customTags').split(/\s+/).filter(Boolean);
            const tags = [...new Set([...selectedTags, ...customTags]
                .map(tag => tag.replace(/^#+/, '').trim()).filter(Boolean))];

            // Frontmatter limitato alle proprietà sintetiche, come nel vault dell'utente.
            // L'analisi completa resta nel corpo della nota, subito dopo le proprietà.
            const noteDate = new Date().toISOString().slice(0, 10);
            const properties = [
                '---',
                `title: ${yamlScalar(bookTitle)}`,
                `author: ${yamlScalar(author)}`,
                `genre: ${yamlScalar(genre)}`,
                `format: ${yamlScalar(format)}`,
                `rating: ${yamlScalar(rating || 'N/D')}`,
                `date: ${noteDate}`,
                yamlPropertyList('tags', tags),
                '---',
            ].join('\n');

            const body = [
                `# ${title}`,
                '',
                `> **In una frase:** ${pitch || 'Da completare'}`,
                '',
                `• **Genere:** ${genre || '—'}`,
                `• **Formato:** ${format || '—'}`,
                `• **Stato:** ${status || '—'}`,
                `• **Valutazione:** ${rating || 'N/D'}`,
                `• **Mood / Emotività:** ${mood || '—'}`,
                '',
                '---',
                '',
                '## 💡 Punti di Forza',
                displayList(strengths, 'Nessun punto inserito.'),
                '',
                '## ⚠️ Punti Deboli / Note',
                displayList(weaknesses, 'Nessun punto debole evidenziato.'),
                '',
                '## 🔑 Temi e Personaggi Chiave',
                themes || 'Da completare.',
                '',
                '## 💬 Citazione Simbolo',
                quote ? lines(quote).map(line => `> ${line}`).join('\n') : 'Da completare.',
                '',
                '## 🎯 A chi lo consiglio',
                audience || 'Da completare.',
                ...(tags.length ? ['', '## 🏷️ Tag', '', tags.map(tag => `#${tag}`).join(' ')] : []),
                '',
            ].join('\n');
            const markdown = `${properties}\n\n${body}`;

            const output = document.getElementById('outputArea');
            if (output) output.value = markdown;

            let copied = false;
            const copyPromise = navigator.clipboard?.writeText(markdown)
                .then(() => { copied = true; })
                .catch(() => {});

            const obsidianUrl = `obsidian://new?name=${encodeURIComponent(title)}&content=${encodeURIComponent(markdown)}`;
            window.location.href = obsidianUrl;

            Promise.resolve(copyPromise).then(() => {
                obsidianBtn.textContent = copied
                    ? '✅ Nota copiata e inviata a Obsidian'
                    : '📝 Nota pronta: copia il testo qui sotto';
                window.setTimeout(() => {
                    obsidianBtn.textContent = '📝 Formatta e Invia a Obsidian';
                }, 3500);
            });
        });
    }

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
            
