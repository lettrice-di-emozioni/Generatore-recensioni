Document.addEventListener("DOMContentLoaded", () => {
  const btnObsidian = document.getElementById("btnObsidian");
  const btnBlog = document.getElementById("btnBlog");
  const btnClear = document.getElementById("btnClear");
  const btnCopy = document.getElementById("btnCopy");
  const btnDownload = document.getElementById("btnDownload");
  const btnAutoTag = document.getElementById("btnAutoTag");
  const outputArea = document.getElementById("outputArea");
  const statusMsg = document.getElementById("status");

  // --- INTEGRATORE RICONOSCIMENTO VOCALE ---
  const btnVoiceGlobal = document.getElementById("btnVoiceGlobal"); // Pulsante voce globale smart (se presente nel file HTML)

  // Ascolto sui singoli microfoni legati agli input (es. pulsante con data-voice-for="bookTitle")
  const voiceButtons = document.querySelectorAll("[data-voice-for]");
  voiceButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-voice-for");
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        avviaRiconoscimentoVocale((testo) => {
          // Aggiunge il testo al campo mantenendo ciò che c'era o sovrascrivendo
          targetInput.value = targetInput.value ? targetInput.value + " " + testo : testo;
          showStatus(`Dettato nel campo: ${testo}`);
        });
      }
    });
  });

  // Ascolto per Comando Smart Globale
  if (btnVoiceGlobal) {
    btnVoiceGlobal.addEventListener("click", () => {
      showStatus("Ascolto attivo... Pronuncia Titolo, Autore, Citazione, ecc. 🎙️");
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
    
    // Attiva sempre i tag base del blog
    selectTagByData('lecodellepagine');
    selectTagByData('bookstagramitalia');
    selectTagByData('consiglidilettura');
    selectTagByData('recensionilibri');

    // Riconoscimento intelligente del genere
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

    const encodedTitle = encodeURIComponent(data.title);
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
    setTimeout(() => { statusMsg.textContent = ""; }, 3000);
  }

  // --- FUNZIONI DI SUPPORTO VOCALE ---
  function avviaRiconoscimentoVocale(callback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il riconoscimento vocale non è supportato su questo browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const trascrizione = event.results[0][0].transcript;
      callback(trascrizione);
    };
    recognition.onerror = (event) => {
      showStatus("Errore nel riconoscimento vocale ❌");
    };
    recognition.start();
  }

  function analizzaECompilaVocale(testo) {
    const testoLower = testo.toLowerCase();

    // Titolo
    if (testoLower.includes('titolo')) {
      const v = testo.split(/titolo/i)[1]?.split(/autore|genere|citazione|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('bookTitle').value = v;
    }
    // Autore
    if (testoLower.includes('autore')) {
      const v = testo.split(/autore/i)[1]?.split(/titolo|genere|citazione|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('bookAuthor').value = v;
    }
    // Genere
    if (testoLower.includes('genere')) {
      const v = testo.split(/genere/i)[1]?.split(/titolo|autore|citazione|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('bookGenre').value = v;
    }
    // Citazione
    if (testoLower.includes('citazione')) {
      const v = testo.split(/citazione/i)[1]?.split(/titolo|autore|genere|punti|valutazione/i)[0]?.trim();
      if (v) document.getElementById('keyQuote').value = v;
    }
    // Punti di forza
    if (testoLower.includes('punti di forza') || testoLower.includes('pregi')) {
      const v = testo.split(/punti di forza|pregi/i)[1]?.split(/titolo|autore|genere|citazione/i)[0]?.trim();
      if (v) document.getElementById('strengths').value = v;
    }
  }
});
                                    
