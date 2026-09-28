document.addEventListener("DOMContentLoaded", () => {
  const btnObsidian = document.getElementById("btnObsidian");
  const btnBlog = document.getElementById("btnBlog");
  const btnClear = document.getElementById("btnClear");
  const btnCopy = document.getElementById("btnCopy");
  const btnDownload = document.getElementById("btnDownload");
  const btnAutoTag = document.getElementById("btnAutoTag");
  const outputArea = document.getElementById("outputArea");
  const statusMsg = document.getElementById("status");
  const btnVoiceGlobal = document.getElementById("btnVoiceGlobal");

  // --- INTEGRATORE RICONOSCIMENTO VOCALE (Inizializzazione Unica per Mobile) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;
  }

  function avviaRiconoscimentoVocale(callback) {
    if (!recognition) {
      alert("Il riconoscimento vocale non è supportato su questo browser.");
      return;
    }

    // Ferma eventuali sessioni precedenti per evitare conflitti su Android
    try { recognition.stop(); } catch(e) {}

    showStatus("🎙️ Ascolto in corso... parla pure!");

    recognition.onresult = (event) => {
      const trascrizione = event.results[0][0].transcript;
      callback(trascrizione);
    };

    recognition.onerror = (event) => {
      console.error("Errore vocale:", event.error);
      if (event.error === 'not-allowed') {
        showStatus("❌ Permesso microfono negato.");
      } else {
        showStatus("❌ Nessun testo rilevato. Riprova.");
      }
    };

    recognition.onend = () => {
      // Pulisce lo stato quando finisce di ascoltare
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Impossibile avviare la dettatura:", err);
    }
  }

  // Ascolto sui singoli microfoni legati agli input
  const voiceButtons = document.querySelectorAll("[data-voice-for]");
  voiceButtons.forEach(btn => {
    // Impedisce al bottone di inviare form o fare bubbling sul label parent
    btn.setAttribute("type", "button");
    
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const targetId = btn.getAttribute("data-voice-for");
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        avviaRiconoscimentoVocale((testo) => {
          targetInput.value = targetInput.value ? targetInput.value + " " + testo : testo;
          showStatus(`Dettato inserito! 📝`);
        });
      }
    });
  });

  // Ascolto per Comando Smart Globale
  if (btnVoiceGlobal) {
    btnVoiceGlobal.setAttribute("type", "button");
    btnVoiceGlobal.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      avviaRiconoscimentoVocale((testo) => {
        analizzaECompilaVocale(testo);
        showStatus("Campi compilati a voce! 🪄");
      });
    });
  }

  // Gestione selezione bottoni Tag
  const tagChips = document.querySelectorAll('.tag-chip');
  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });

  // Generatore/Suggeritore Automatico Tag
  btnAutoTag.addEventListener('click', () => {
    const genreText = (document.getElementById("bookGenre").value + " " + document.getElementById("bookTitle").value).toLowerCase();
    
    selectTagByData('lecodellepagine');
    selectTagByData('bookstagramitalia');
    selectTagByData('consiglidilettura');
    selectTagByData('recensionilibri');

    if (genreText.includes('classici') || genreText.includes('classico')) selectTagByData('classici');
    if (genreText.includes('thriller') || genreText.includes('giallo') || genreText.includes('noir')) {
      selectTagByData('thriller');
      selectTagByData('psicologico');
    }
    if (genreText.includes('storico') || genreText.includes('storia')) selectTagByData('storico');
    if (genreText.includes('saggio') || genreText.includes('saggistica')) selectTagByData('saggistica');
    if (genreText.includes('narrativa') || genreText.includes('romanzo')) selectTagByData('narrativa');

    showStatus("Tag suggeriti applicati! 🪄");
  });

  function selectTagByData(tagName) {
    const chip = document.querySelector(`.tag-chip[data-tag="${tagName}"]`);
    if (chip) chip.classList.add('selected');
  }

  function getFormData() {
    const selectedTags = Array.from(document.querySelectorAll('.tag-chip.selected'))
                              .map(chip => chip.getAttribute('data-tag'));
    
    const customTagsRaw = document.getElementById("customTags").value.trim();
    const customTags = customTagsRaw ? customTagsRaw.split(/\s+/).map(t => t.replace('#', '')) : [];

    const allTags = [...new Set([...selectedTags, ...customTags])];

    return {
      title: document.getElementById("bookTitle").value.trim() || "Senza Titolo",
      author: document.getElementById("bookAuthor").value.trim() || "Autore Sconosciuto",
      genre: document.getElementById("bookGenre").value.trim() || "Generico",
      format: document.getElementById("bookFormat").value,
      rating: document.getElementById("bookRating").value.trim() || "N/D",
      mood: document.getElementById("bookMood").value.trim() || "",
      pitch: document.getElementById("pitch").value.trim() || "",
      strengths: document.getElementById("strengths").value.trim() || "",
      weaknesses: document.getElementById("weaknesses").value.trim() || "",
      themes: document.getElementById("themes").value.trim() || "",
      quote: document.getElementById("keyQuote").value.trim() || "",
      target: document.getElementById("targetAudience").value.trim() || "",
      tags: allTags
    };
  }

  // Formattazione per Obsidian
  btnObsidian.addEventListener("click", () => {
      // Leggi lo stato selezionato per decidere la cartella
  const selectStato = document.getElementById('stato-libro');
  const stato = selectStato ? selectStato.value : 'in-lettura';
  let cartellaDestinazione = (stato === 'letto') ? 'Letti/' : 'In Lettura/';
    
    const data = getFormData();
    
    const yamlTags = data.tags.length > 0 
      ? "\ntags:\n" + data.tags.map(tag => `  - ${tag}`).join("\n")
      : "\ntags:\n  - recensioni\n  - libri";

    const mdContent = `---
title: "${data.title}"
author: "${data.author}"
genre: "${data.genre}"
format: "${data.format}"
rating: "${data.rating}"
date: ${new Date().toISOString().split('T')[0]}${yamlTags}
---

# ${data.title} - ${data.author}

> **In una frase:** ${data.pitch}

- **Genere:** ${data.genre}
- **Formato:** ${data.format}
- **Valutazione:** ${data.rating}
- **Mood / Emotività:** ${data.mood}

---

### 💡 Punti di Forza
${data.strengths || "Nessun punto inserito."}

### ⚠️ Punti Deboli / Note
${data.weaknesses || "Nessun punto debole evidenziato."}

### 🗝️ Temi e Personaggi Chiave
${data.themes}

### 💬 Citazione Simbolo
> ${data.quote}

### 🎯 A chi lo consiglio
${data.target}
`;

    outputArea.value = mdContent;

    const encodedTitle = encodeURIComponent(cartellaDestinazione + data.title);
    const encodedContent = encodeURIComponent(mdContent);
    const obsidianUri = `obsidian://new?name=${encodedTitle}&content=${encodedContent}`;

    try {
      window.location.href = obsidianUri;
      showStatus("Invio a Obsidian in corso... 🚀");
    } catch (e) {
      showStatus("Nota formattata! Usa Copia se Obsidian non si apre.");
    }
  });

  // Formattazione per Blog / Social
  btnBlog.addEventListener("click", () => {
    const data = getFormData();
    
    const stringTags = data.tags.length > 0 
      ? `<br><p><em>${data.tags.map(t => '#' + t).join(" ")}</em></p>`
      : "";

    const htmlContent = `<h2>Recensione: ${data.title} di ${data.author}</h2>
<p><strong>Genere:</strong> ${data.genre} | <strong>Valutazione:</strong> ${data.rating}</p>

<p><em>"${data.pitch}"</em></p>

<h3>Cosa mi è piaciuto</h3>
<p>${data.strengths}</p>

${data.weaknesses ? `<h3>Aspetti meno convincenti</h3><p>${data.weaknesses}</p>` : ''}

<blockquote>"${data.quote}"</blockquote>

<p><strong>Consigliato a:</strong> ${data.target}</p>${stringTags}`;

    outputArea.value = htmlContent;
    showStatus("Scheda formattata per il Blog con Hashtag!");
  });

  btnCopy.addEventListener("click", () => {
    if (!outputArea.value) return;
    navigator.clipboard.writeText(outputArea.value).then(() => {
      showStatus("Copiato negli appunti! 📋");
    });
  });

  btnDownload.addEventListener("click", () => {
    if (!outputArea.value) return;
    const data = getFormData();
    const blob = new Blob([outputArea.value], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_scheda.md`;
    a.click();
    showStatus("File .md scaricato! 💾");
  });

  btnClear.addEventListener("click", () => {
    document.querySelectorAll("input, textarea").forEach(input => input.value = "");
    document.querySelectorAll(".tag-chip").forEach(chip => chip.classList.remove("selected"));
    outputArea.value = "";
    showStatus("Campi e tag svuotati.");
  });

  function showStatus(msg) {
    statusMsg.textContent = msg;
    setTimeout(() => { statusMsg.textContent = ""; }, 3500);
  }

  function analizzaECompilaVocale(testo) {
    const testoLower = testo.toLowerCase();

    if (testoLower.includes('titolo')) {
      const v = testo.split(/titolo/i)[1]?.split(/autore|genere|citazione|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('bookTitle').value = v;
    }
    if (testoLower.includes('autore')) {
      const v = testo.split(/autore/i)[1]?.split(/titolo|genere|citazione|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('bookAuthor').value = v;
    }
    if (testoLower.includes('genere')) {
      const v = testo.split(/genere/i)[1]?.split(/titolo|autore|citazione|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('bookGenre').value = v;
    }
    if (testoLower.includes('citazione')) {
      const v = testo.split(/citazione/i)[1]?.split(/titolo|autore|genere|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('keyQuote').value = v;
    }
    if (testoLower.includes('punti di forza') || testoLower.includes('pregi')) {
      const v = testo.split(/punti di forza|pregi/i)[1]?.split(/titolo|autore|genere|citazione/i)[0]?.trim();
      if (v) document.getElementById('strengths').value = v;
    }
  }
});
    
