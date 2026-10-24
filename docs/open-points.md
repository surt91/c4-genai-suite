# Offene Punkte

Sammelstelle für geplante Arbeit, offene Entscheidungen und bewusst zurückgestellte Punkte. Erledigte Punkte werden
entfernt (die Historie steht im Git-Log). Feature-Ideen mit Wettbewerbsvergleich stehen in der [Roadmap](roadmap.md).

## Geplant

### REI-S: asynchrone Verarbeitung von Dateien

Dateien werden heute synchron an REI-S übergeben. Das Backend hält die HTTP-Verbindung offen, während REI-S
extrahiert, konvertiert (LibreOffice, ffmpeg, Whisper), chunkt, embeddet und speichert. Bei großen Dateien dauert
das Minuten. Ziel: Upload bestätigt sofort, Verarbeitung im Hintergrund mit Status (wartet, läuft, fertig,
fehlgeschlagen), Retries und Abbruch. Konzept: [concepts/async-ingestion.md](concepts/async-ingestion.md).

Entschieden: Job-Queue in Postgres innerhalb von REI-S, das Backend fragt den Status gebündelt ab (alle
Entscheidungen im Konzept, Abschnitt 9).
Aufwand etwa 15–18 Personentage in 7 PRs. Löst nebenbei die Backend-Findings P2-21 und P2-28, die doppelte
Verarbeitung von Chat-Dateien und liegen bleibende Chunks, wenn eine Datei während der Verarbeitung gelöscht wird.

Voraussetzung für die beiden folgenden Punkte, weil beide die Verarbeitung teurer machen.

### REI-S: hybride Suche und Reranking

Heute gibt es nur Vektorsuche. Geplant:

- **Hybride Suche** für pgvector: Postgres-Volltextsuche (`tsvector`, sprachabhängig) plus Vektorsuche, kombiniert
  per Reciprocal Rank Fusion. Hilft bei Eigennamen, IDs, Abkürzungen und exakten Begriffen, die Embeddings schlecht
  treffen. Azure AI Search bringt hybride Suche selbst mit.
- **Reranking** als optionaler zweiter Schritt: Top-k Kandidaten mit einem Cross-Encoder bzw. Rerank-Modell neu
  bewerten (lokal, z. B. über einen Ollama-/TEI-Endpunkt, oder über eine Rerank-API). Konfigurierbar pro Bucket.
- **Messen** mit den QA-Katalogen des Eval-Service, bevor es Standard wird.

Aufwand: M (REI-S, Backend-Konfiguration der Buckets, Eval-Messung).

### REI-S: Docling als Parser evaluieren

[Docling](https://github.com/docling-project/docling) erkennt Layout, Lesereihenfolge, Tabellen und Formeln und kann
OCR. Es liefert strukturiertes Markdown für PDF, DOCX, PPTX, XLSX und HTML. Heute nutzt REI-S pypdf bzw. pdfminer
(nur Text, keine Tabellen, kein OCR) und LibreOffice für die Office-Konvertierung.

- **Vorteile:** deutlich bessere Chunks bei Tabellen, mehrspaltigen Layouts und gescannten PDFs; ein Parser für
  mehrere Formate; strukturbewusstes Chunking (Überschriften, Tabellen bleiben zusammen).
- **Nachteile:** Docling bringt PyTorch und Layout-/OCR-Modelle mit (das Image wird um etwa 1–2 GB größer) und ist auf
  der CPU um Größenordnungen langsamer als pypdf. Ohne asynchrone Verarbeitung ist das nicht tragbar.
- **Vorschlag:** Docling als zusätzlichen, konfigurierbaren Parser einführen (eigene Image-Variante oder optionales
  Extra), mit den Eval-Katalogen gegen pypdf messen und erst dann zum Standard machen. pdfminer kann entfallen, pypdf
  bleibt als schneller Fallback. LibreOffice bleibt vorerst für die PDF-Vorschau von Office-Dateien.

Aufwand: M, nach der asynchronen Verarbeitung.

## Nach dem ersten Release

- **`release-as` entfernen:** `.github/release-please-config.json` erzwingt für das erste Release die Version 1.0.0.
  Direkt nach dem Release muss der Eintrag raus, sonst schlägt release-please jedes Mal wieder 1.0.0 vor.

## Offene Entscheidungen

- **GitHub Issues und Discussions:** aktivieren oder die Links in `CONTRIBUTING.md` entfernen.
- **ARM-Images für `main`:** zusätzlich arm64 auf nativen ARM-Runnern bauen? Heute müssen ARM-Nutzer `--build`
  verwenden.
- **Elicitation im Dev-MCP-Proxy:** Anfragen von stdio-Servern durchreichen (etwa ein halber Tag). Umsetzen, sobald
  es gebraucht wird.

## Zurückgestellt

Details stehen in den Review-Dokumenten.

- **Chat:** Tool-Inputs und -Outputs im Inspector; Modal für lange Formulare; Tablet-Layout manuell prüfen
  ([ux/chat-overhaul.md](ux/chat-overhaul.md), Abschnitt 8).
- **Frontend:** Server-State in den zustand-Stores durch react-query ersetzen (P2-22); Transkription in Safari
  ([review/frontend.md](review/frontend.md)).
- **REI-S:** HTML-Markup vor dem Indexieren entfernen (Produktentscheidung); Validierung der Index-Namen; Löschen von
  mehr als 50 Chunks in Azure AI Search ([review/reis.md](review/reis.md)).
- **Eval-Service:** bewusst nicht angefasst, bis er produktionsreif werden soll.
