// ==========================================
// Gestione del Riconoscimento Vocale (Mobile & Desktop)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('mic-button');
    const reviewInput = document.getElementById('review-input');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Il riconoscimento vocale non è supportato da questo browser.");
        if (micButton) micButton.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false; // Imposta false per evitare parole duplicate
    recognition.continuous = false;

    let isListening = false;
    let micPermissionGranted = false;

    // Funzione che forza il browser a mostrare il popup dei permessi
    async function requestMicrophoneAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Chiude subito lo stream: serviva solo per ottenere il permesso dal browser
            stream.getTracks().forEach(track => track.stop());
            micPermissionGranted = true;
            return true;
        } catch (err) {
            console.error("Permesso microfono negato o non disponibile:", err);
            alert("Per usare la voce devi consentire l'accesso al microfono quando richiesto dal browser.");
            return false;
        }
    }

    if (micButton) {
        micButton.addEventListener('click', async () => {
            if (isListening) {
                recognition.stop();
                return;
            }

            // Se non abbiamo ancora il permesso confermato, facciamo apparire il popup nativo
            if (!micPermissionGranted) {
                const ok = await requestMicrophoneAccess();
                if (!ok) return;
            }

            try {
                recognition.start();
            } catch (err) {
                console.error("Errore avvio recognition:", err);
            }
        });
    }

    recognition.onstart = () => {
        isListening = true;
        if (micButton) micButton.classList.add('active');
        console.log("Microfono attivo, puoi parlare...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (reviewInput && transcript) {
            // Aggiunge la frase alla casella di testo con uno spazio
            reviewInput.value = reviewInput.value 
                ? `${reviewInput.value} ${transcript}` 
                : transcript;
        }
    };

    recognition.onerror = (event) => {
        console.error("Errore del microfono:", event.error);
        isListening = false;
        if (micButton) micButton.classList.remove('active');
    };

    recognition.onend = () => {
        isListening = false;
        if (micButton) micButton.classList.remove('active');
        console.log("Riconoscimento vocale terminato.");
    };
});
