// ==========================================
// Gestione del Riconoscimento Vocale (PWA / Mobile)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Assicurati che nel tuo file index.html ci siano elementi con questi ID
    // Esempio: <button id="mic-button">🎤</button> e <textarea id="review-input"></textarea>
    const micButton = document.getElementById('mic-button');
    const reviewInput = document.getElementById('review-input');

    // Controllo di compatibilità: standard o versione con prefisso mobile (webkit)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Il riconoscimento vocale non è supportato da questo browser.");
        if (micButton) {
            micButton.style.display = 'none'; // Nasconde il microfono se non compatibile
        }
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';        // Imposta la lingua italiana
    recognition.interimResults = true; // Mostra i testi provvisori mentre parli
    recognition.continuous = false;    // Interrompe l'ascolto alla fine della frase

    let isListening = false;

    if (micButton) {
        micButton.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    }

    recognition.onstart = () => {
        isListening = true;
        if (micButton) micButton.classList.add('active');
        console.log("Microfono attivo, puoi parlare...");
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        // Aggiunge il testo dettato all'interno della casella di testo
        if (reviewInput) {
            reviewInput.value += (reviewInput.value ? ' ' : '') + transcript;
        }
    };

    recognition.onerror = (event) => {
        console.error("Errore del microfono:", event.error);
    };

    recognition.onend = () => {
        isListening = false;
        if (micButton) micButton.classList.remove('active');
        console.log("Riconoscimento vocale terminato.");
    };
});
