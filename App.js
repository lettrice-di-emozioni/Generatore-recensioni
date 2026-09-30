document.addEventListener('DOMContentLoaded', () => {
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
            
