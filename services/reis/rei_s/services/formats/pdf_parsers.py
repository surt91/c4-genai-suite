"""Page-wise text extraction from PDFs with pdfminer.six and pypdf.

The output (page content and metadata) matches what the `PDFMinerParser` and `PyPDFParser` of
langchain-community produced in `mode="page"` without image extraction, which this replaces.
"""

from datetime import datetime
from io import StringIO
from typing import Any, BinaryIO

from langchain_core.documents import Document
from pdfminer.converter import PDFLayoutAnalyzer
from pdfminer.layout import LAParams, LTContainer, LTPage, LTText, LTTextBox
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFPageInterpreter, PDFResourceManager
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFParser
from pdfminer.psparser import PSLiteral
from pdfminer.utils import PDFDocEncoding
import pypdf

from rei_s import logger

# value of `source` in the metadata (the name of the in-memory blob)
SOURCE = "stream"

_METADATA_KEY_MAP = {
    "page_count": "total_pages",
    "file_path": "source",
}


def _purge_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """Normalize the keys (lower case, without leading `/`) and convert values to `str`/`int`."""
    new_metadata: dict[str, Any] = {}
    for k, v in metadata.items():
        if type(v) not in [str, int]:
            v = str(v)
        if k.startswith("/"):
            k = k[1:]
        k = k.lower()
        if k in ["creationdate", "moddate"]:
            try:
                new_metadata[k] = datetime.strptime(v.replace("'", ""), "D:%Y%m%d%H%M%S%z").isoformat("T")
            except ValueError:
                new_metadata[k] = v
        elif k in _METADATA_KEY_MAP:
            new_metadata[_METADATA_KEY_MAP[k]] = v
            new_metadata[k] = v
        elif isinstance(v, str):
            new_metadata[k] = v.strip()
        elif isinstance(v, int):
            new_metadata[k] = v
    return new_metadata


def _decode_text(s: bytes | str) -> str:
    """Decode a PDFDocEncoding (or UTF-16 with BOM) string."""
    if isinstance(s, bytes) and s.startswith(b"\xfe\xff"):
        return str(s[2:], "utf-16be", "ignore")
    try:
        ords = (ord(c) if isinstance(c, str) else c for c in s)
        return "".join(PDFDocEncoding[o] for o in ords)
    except IndexError:
        return str(s)


def _resolve_and_decode(obj: Any) -> Any:
    if hasattr(obj, "resolve"):
        obj = obj.resolve()
    if isinstance(obj, list):
        return [_resolve_and_decode(i) for i in obj]
    elif isinstance(obj, PSLiteral):
        return _decode_text(obj.name)
    elif isinstance(obj, (str, bytes)):
        return _decode_text(obj)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            obj[k] = _resolve_and_decode(v)
        return obj
    return obj


def _pdfminer_metadata(fp: BinaryIO) -> dict[str, Any]:
    doc = PDFDocument(PDFParser(fp), password="", caching=True)
    metadata: dict[str, Any] = {}
    for info in doc.info:
        metadata.update(info)
    for k, v in metadata.items():
        try:
            metadata[k] = _resolve_and_decode(v)
        except Exception as e:  # pragma: no cover
            # keep the raw value of metadata that can not be decoded instead of failing
            logger.warning(f'Metadata key "{k}" could not be parsed due to exception: {e}')
    metadata["total_pages"] = len(list(PDFPage.create_pages(doc)))

    # pdfs without these entries would be rejected otherwise
    defaults = {"producer": "REIS", "creator": "REIS", "creationdate": ""}
    for key, val in defaults.items():
        # match case insensitive
        if not any(k.lower() == key.lower() for k in metadata.keys()):
            metadata[key] = val

    return metadata


class _TextCollector(PDFLayoutAnalyzer):
    def __init__(self, rsrcmgr: PDFResourceManager, text_io: StringIO) -> None:
        super().__init__(rsrcmgr, pageno=1, laparams=LAParams())
        self.text_io = text_io

    def receive_layout(self, ltpage: LTPage) -> None:
        def render(item: object) -> None:
            if isinstance(item, LTContainer):
                for child in item:
                    render(child)
            elif isinstance(item, LTText):
                self.text_io.write(item.get_text())
            if isinstance(item, LTTextBox):
                self.text_io.write("\n")

        render(ltpage)


def parse_pdf_pdfminer(fp: BinaryIO) -> list[Document]:
    """Extract the text of every page with pdfminer.six, one document per page (`page` starts at 0).

    `fp` needs to be seekable, it is read more than once.
    """
    doc_metadata = _purge_metadata(
        {"producer": "PDFMiner", "creator": "PDFMiner", "creationdate": ""} | _pdfminer_metadata(fp)
    )
    doc_metadata["source"] = SOURCE

    text_io = StringIO()
    rsrcmgr = PDFResourceManager()
    interpreter = PDFPageInterpreter(rsrcmgr, _TextCollector(rsrcmgr, text_io))
    documents = []
    for i, page in enumerate(PDFPage.get_pages(fp, password="")):
        text_io.truncate(0)
        text_io.seek(0)
        interpreter.process_page(page)
        documents.append(Document(page_content=text_io.getvalue().strip(), metadata=doc_metadata | {"page": i}))
    return documents


def parse_pdf_pypdf(fp: BinaryIO) -> list[Document]:
    """Extract the text of every page with pypdf, one document per page (`page` starts at 0)."""
    reader = pypdf.PdfReader(fp)
    doc_metadata = _purge_metadata(
        {"producer": "PyPDF", "creator": "PyPDF", "creationdate": ""}
        | dict(reader.metadata or {})
        | {"source": SOURCE, "total_pages": len(reader.pages)}
    )
    return [
        Document(
            page_content=page.extract_text(extraction_mode="plain").strip(),
            metadata=doc_metadata | {"page": n, "page_label": reader.page_labels[n]},
        )
        for n, page in enumerate(reader.pages)
    ]
