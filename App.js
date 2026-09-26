document.addEventListener("DOMContentLoaded", () => {
  const btnObsidian = document.getElementById("btnObsidian");
  const btnBlog = document.getElementById("btnBlog");
  const btnClear = document.getElementById("btnClear");
  const btnCopy = document.getElementById("btnCopy");
  const btnDownload = document.getElementById("btnDownload");
  const outputArea = document.getElementById("outputArea");
  const statusMsg = document.getElementById("status");

  function getFormData() {
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
      target: document.getElementById("targetAudience").value.trim() || ""
    };
  }

  // Formattazione per Obsidian e apertura automatica
  btnObsidian.addEventListener("click", () => {
    const data = getFormData();
    
    const mdContent = `---
title: "${data.title}"
author: "${data.author}"
genre: "${data.genre}"
format: "${data.format}"
rating: "${data.rating}"
date: ${new Date().toISOString().split('T')[0]}
tags:
  - recensioni
  - libri
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

    // URL Scheme senza vault specifico (usa quello correntemente aperto)
    const encodedTitle = encodeURIComponent(data.title);
    const encodedContent = encodeURIComponent(mdContent);
    const obsidianUri = `obsidian://new?name=${encodedTitle}&content=${encodedContent}`;

    try {
      window.location.href = obsidianUri;
      showStatus("Invio a Obsidian in corso... 🚀");
    } catch (e) {
      showStatus("Nota formattata! Se Obsidian non si apre, usa Copia.");
    }
  });

  // Formattazione per Blog (HTML / Testo Pulito)
  btnBlog.addEventListener("click", () => {
    const data = getFormData();
    
    const htmlContent = `<h2>Recensione: ${data.title} di ${data.author}</h2>
<p><strong>Genere:</strong> ${data.genre} | <strong>Valutazione:</strong> ${data.rating}</p>

<p><em>"${data.pitch}"</em></p>

<h3>Cosa mi è piaciuto</h3>
<p>${data.strengths}</p>

${data.weaknesses ? `<h3>Aspetti meno convincenti</h3><p>${data.weaknesses}</p>` : ''}

<blockquote>"${data.quote}"</blockquote>

<p><strong>Consigliato a:</strong> ${data.target}</p>`;

    outputArea.value = htmlContent;
    showStatus("Scheda formattata per il Blog!");
  });

  // Copia negli appunti
  btnCopy.addEventListener("click", () => {
    if (!outputArea.value) return;
    navigator.clipboard.writeText(outputArea.value).then(() => {
      showStatus("Copiato negli appunti! 📋");
    });
  });

  // Scarica file .md
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

  // Svuota campi
  btnClear.addEventListener("click", () => {
    document.querySelectorAll("input, textarea").forEach(input => input.value = "");
    outputArea.value = "";
    showStatus("Campi svuotati.");
  });

  function showStatus(msg) {
    statusMsg.textContent = msg;
    setTimeout(() => { statusMsg.textContent = ""; }, 3000);
  }
});
