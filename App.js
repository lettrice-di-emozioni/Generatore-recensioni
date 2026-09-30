// ==========================================
// Gestione del Riconoscimento Vocale Multi-Campo
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controllo supporto API nel browser
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Il riconoscimento vocale non è supportato da questo browser.");
        // Nasconde tutti i microfoni se il browser non supporta la funzione
        document.querySelectorAll('.mic-btn').forEach(btn => btn.style.display = 'none');
        return;
    }

    // 2. Configurazione riconoscimento vocale
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false; // Evita parole ripetute
    recognition.continuous = false;

    let isListening = false;
    let micPermissionGranted = false;
    let currentInputField = null;
    let currentActiveButton = null;

    // 3. Funzione che forza la comparsa del popup dei permessi su Chrome / Safari
    async function requestMicrophoneAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Chiude subito la traccia: serviva solo per ottenere l'autorizzazione di sistema
            stream.getTracks().forEach(track => track.stop());
            micPermissionGranted = true;
            return true;
        } catch (err) {
            console.error("Permesso microfono negato o non disponibile:", err);
            alert("Per usare i comandi vocali devi consentire l'accesso al microfono quando richiesto dal browser.");
            return false;
        }
    }

    // 4. Collega tutti i pulsanti con classe .mic-btn
    const micButtons = document.querySelectorAll('.mic-btn');

    micButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            // Se stiamo già ascoltando sullo stesso pulsante, fermiamo la registrazione
            if (isListening && currentActiveButton === btn) {
                recognition.stop();
                return;
            }

            // Se stiamo ascoltando su un altro campo, prima lo arrestiamo
            if (isListening) {
                recognition.stop();
            }

            // Recupera l'ID del campo collegato tramite l'attributo data-target
            const targetId = btn.getAttribute('data-target');
            currentInputField = document.getElementById(targetId);
            currentActiveButton = btn;

            if (!currentInputField) {
                console.warn(`Nessun campo trovato con id "${targetId}"`);
                return;
            }

            // Forza il popup dei permessi al primo tap se non ancora concesso
            if (!micPermissionGranted) {
                const ok = await requestMicrophoneAccess();
                if (!ok) return;
            }

            try {
                recognition.start();
            } catch (err) {
                console.error("Errore durante l'avvio della registrazione:", err);
            }
        });
    });

    // 5. Eventi del ciclo di vita del microfono
    recognition.onstart = () => {
        isListening = true;
        if (currentActiveButton) currentActiveButton.classList.add('active');
        console.log("Ascolto attivo sul campo:", currentInputField?.id);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (currentInputField && transcript) {
            // Aggiunge il testo dettato preservando il testo già presente
            currentInputField.value = currentInputField.value 
                ? `${currentInputField.value} ${transcript}` 
                : transcript;

            // Notifica eventuali listener di eventi (es. framework o auto-salvataggio)
            currentInputField.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    recognition.onerror = (event) => {
        console.error("Errore del microfono:", event.error);
        isListening = false;
        if (currentActiveButton) currentActiveButton.classList.remove('active');
    };

    recognition.onend = () => {
        isListening = false;
        if (currentActiveButton) currentActiveButton.classList.remove('active');
        console.log("Riconoscimento vocale terminato.");
    };
});
