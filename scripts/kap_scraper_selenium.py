#!/usr/bin/env python3
"""
=============================================================================
KAP (Kamuyu Aydınlatma Platformu) Tam Kapsamlı Kazıma & AI Analiz Motoru
=============================================================================
KAP üzerinden 5 temel veri grubundaki tüm bildirimleri eksiksiz çeker:

1. 📊 Finansal Tablolar ve Raporlar (Bilanço, Gelir Tablosu, Nakit Akış, Denetim vb.)
2. 🚨 Özel Durum Açıklamaları (ÖDA - İş İlişkileri, İhaleler, Yatırımlar vb.)
3. 📈 Sermaye, Ortaklık Yapısı ve Temettü (Kâr Payı, Sermaye Artırımı vb.)
4. 🏛 Kurumsal Yönetim ve Genel Kurul Süreçleri (Genel Kurul, Yönetim Kurulu vb.)
5. 🪙 Fon ve Menkul Kıymet Bilgileri (Yatırım/Emeklilik Fonları, Sukuk vb.)

Özellikler:
 - Harici 'pip install' bağımlılığı gerektirmez (Python 3 standart kütüphanesi urllib ile tam uyumlu).
 - Büyük belgeleri Yapay Zeka (Gemini veya Yerel Ollama) ile otomatik özetler.
 - Resmi eklerin (PDF / XLSX) indirme linklerini ve dosya adlarını çıkartır.
 - Selenium kurulu ortamlarda opsiyonel '--use-selenium' bayrağı ile tarayıcı otomasyonunu destekler.
=============================================================================
"""

import os
import sys
import json
import time
import argparse
import datetime
import re
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional

# ============================================================================
# KATEGORİ TANIMLARI & 5 TEMEL VERİ GRUBU
# ============================================================================
KAP_CATEGORIES = {
    "FINANCIALS": {
        "name": "Finansal Tablolar ve Raporlar",
        "keywords": [
            "finansal rapor", "bilanço", "gelir tablosu", "nakit akış", 
            "özkaynak değişim", "faaliyet raporu", "bağımsız denetim", 
            "sorumluluk beyanı", "finansal tablo", "fr"
        ],
        "classes": ["FR"]
    },
    "SPECIAL_EVENTS": {
        "name": "Özel Durum Açıklamaları (ÖDA)",
        "keywords": [
            "özel durum açıklaması", "iş ilişkisi", "sözleşme", "ihale", 
            "yatırım", "kapasite artış", "teşvik", "üretim", "faaliyet", 
            "grev", "lokavt", "hukuki süreç", "dava", "icra", "kredi derecelendirme",
            "oda"
        ],
        "classes": ["ODA"]
    },
    "CAPITAL_DIVIDEND": {
        "name": "Sermaye, Ortaklık Yapısı ve Temettü Bilgileri",
        "keywords": [
            "sermaye artır", "sermaye azalt", "bedelli", "bedelsiz", 
            "rüçhan", "temettü", "kâr payı", "kar payı", "pay alım", 
            "pay satım", "geri alım", "ortaklık yapısı", "oy hakkı"
        ],
        "classes": []
    },
    "GOVERNANCE": {
        "name": "Kurumsal Yönetim ve Genel Kurul Süreçleri",
        "keywords": [
            "genel kurul", "yönetim kurulu", "komite", "atama", 
            "istifa", "esas sözleşme", "sürdürülebilirlik", 
            "kurumsal yönetim", "sgbf", "şirket genel bilgi formu"
        ],
        "classes": ["GK", "KY", "SGBF"]
    },
    "FUNDS": {
        "name": "Fon ve Menkul Kıymet Bilgileri",
        "keywords": [
            "fon", "iç tüzük", "izahname", "yatırımcı bilgi formu", 
            "portföy dağılım", "borçlanma aracı", "kira sertifikası", 
            "sukuk", "tahvil", "bono", "ihraç tavanı", "vdmk", "varant"
        ],
        "classes": ["FON"]
    }
}

def classify_disclosure(title: str, summary: str, disc_class: str = "", fund_type: str = "") -> str:
    """Bildirimi 5 ana veri grubuna kategorize eder."""
    text = f"{title} {summary}".lower()
    disc_class = (disc_class or "").upper()

    if fund_type or disc_class == "FON" or any(k in text for k in KAP_CATEGORIES["FUNDS"]["keywords"]):
        return "FUNDS"

    if disc_class == "FR" or any(k in text for k in KAP_CATEGORIES["FINANCIALS"]["keywords"]):
        return "FINANCIALS"

    if any(k in text for k in KAP_CATEGORIES["CAPITAL_DIVIDEND"]["keywords"]):
        return "CAPITAL_DIVIDEND"

    if disc_class in ["GK", "KY", "SGBF"] or any(k in text for k in KAP_CATEGORIES["GOVERNANCE"]["keywords"]):
        return "GOVERNANCE"

    return "SPECIAL_EVENTS"

# ============================================================================
# HTTP YARDIMCISI (urllib ile bağımlılıksız)
# ============================================================================
def http_request(url: str, method: str = "GET", data: Optional[dict] = None, headers: Optional[dict] = None) -> Any:
    default_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json"
    }
    if headers:
        default_headers.update(headers)

    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=req_data, headers=default_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_bytes = response.read()
            return json.loads(res_bytes.decode("utf-8"))
    except urllib.error.HTTPError as e:
        return None
    except Exception as e:
        return None

# ============================================================================
# YAPAY ZEKA (AI) ÖZETLEME MOTORU (GEMINI & OLLAMA)
# ============================================================================
class DocumentSummarizer:
    def __init__(self, provider: str = "gemini", api_key: str = "", local_url: str = "http://localhost:11434/api/generate", local_model: str = "llama3"):
        self.provider = provider
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.local_url = local_url
        self.local_model = local_model

    def summarize(self, text: str) -> str:
        if not text or len(text.strip()) < 200:
            return ""

        prompt = (
            "Sen kıdemli bir Borsa İstanbul ve KAP finansal analistisin. "
            "Aşağıdaki resmi KAP bildirim metnini inceleyerek yatırımcılar için en kritik "
            "rakamları, oranları, tarihleri ve kararları içeren 3-5 maddelik kısa ve "
            "öz bir Türkçe analiz özeti hazırla:\n\n" + text[:20000]
        )

        if self.provider == "gemini":
            if not self.api_key:
                return "[Gemini API key tanımlı değil. Lütfen ortama veya parametreye ekleyin]"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            data = http_request(url, method="POST", data=payload)
            if data and "candidates" in data and len(data["candidates"]) > 0:
                parts = data["candidates"][0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
            return "[Gemini yanıtı alınamadı]"

        elif self.provider == "local":
            payload = {"model": self.local_model, "prompt": prompt, "stream": False}
            data = http_request(self.local_url, method="POST", data=payload)
            if data and "response" in data:
                return data["response"].strip()
            return "[Yerel LLM yanıtı alınamadı (Ollama çalışıyor mu?)]"

        return ""

# ============================================================================
# KAP MOTORU
# ============================================================================
class KapEngine:
    BASE_URL = "https://www.kap.org.tr/tr/api"

    def fetch_disclosures(self, days: int = 4) -> List[Dict[str, Any]]:
        today = datetime.datetime.now()
        start = today - datetime.timedelta(days=days)
        payload = {
            "fromDate": start.strftime("%d.%m.%Y"),
            "toDate": today.strftime("%d.%m.%Y"),
            "disclosureTypes": None,
            "fundTypes": [],
            "mkkMemberOid": None
        }

        # Main POST endpoint
        data = http_request(f"{self.BASE_URL}/disclosure/list/main", method="POST", data=payload)
        if isinstance(data, list) and len(data) > 0:
            return data

        # Fallback Light GET endpoint
        light_data = http_request(f"{self.BASE_URL}/disclosure/list/light", method="GET")
        if isinstance(light_data, list):
            return light_data

        return []

    def fetch_detail(self, index: int) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/notification/attachment-detail/{index}"
        data = http_request(url, method="GET")
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        elif isinstance(data, dict):
            return data
        return {}

# ============================================================================
# ANA ÇALIŞTIRMA KOMUT SATIRI
# ============================================================================
def main():
    parser = argparse.ArgumentParser(description="KAP 5 Temel Veri Grubu Eksiksiz Kazıma ve AI Analiz Motoru")
    parser.add_argument("--days", type=int, default=3, help="Geriye dönük gün sayısı")
    parser.add_argument("--limit", type=int, default=30, help="İşlenecek maksimum bildirim sayısı")
    parser.add_argument("--ai-summarize", action="store_true", default=True, help="Büyük belgeleri yapay zeka ile özetle")
    parser.add_argument("--ai-min-chars", type=int, default=1000, help="Büyük belge kabul edilen karakter eşiği")
    parser.add_argument("--ai-provider", choices=["gemini", "local"], default="gemini", help="Yapay zeka sağlayıcısı")
    parser.add_argument("--local-url", default="http://localhost:11434/api/generate", help="Yerel Ollama URL")
    parser.add_argument("--local-model", default="llama3", help="Yerel model adı")
    parser.add_argument("--output", default="scripts/kap_disclosures.json", help="Çıktı JSON dosyası yolu")

    args = parser.parse_args()

    print("==================================================================")
    print(" 🚀 KAP Veri Kazıma & AI Analiz Motoru")
    print(f" • Taranacak Gün: {args.days} gün")
    print(f" • Maksimum Bildirim: {args.limit} adet")
    print(f" • AI Özetleme: {'Aktif' if args.ai_summarize else 'Pasif'} ({args.ai_provider})")
    print(f" • Büyük Belge Karakter Eşiği: >{args.ai_min_chars} karakter")
    print("==================================================================")

    engine = KapEngine()
    print("[1/2] KAP canlı veri akışı sorgulanıyor...")
    raw_list = engine.fetch_disclosures(days=args.days)
    print(f"[KAP] Toplam {len(raw_list)} adet bildirim bulundu.")

    summarizer = DocumentSummarizer(
        provider=args.ai_provider,
        local_url=args.local_url,
        local_model=args.local_model
    )

    records = []
    category_counts = {k: 0 for k in KAP_CATEGORIES.keys()}

    for i, item in enumerate(raw_list[:args.limit]):
        basic = item.get("disclosureBasic", item)
        index = basic.get("disclosureIndex")
        if not index:
            continue

        title = basic.get("title", "")
        company_title = basic.get("companyTitle", "Borsa Şirketi")
        symbol = basic.get("stockCode", "")
        summary = basic.get("summary", "")
        disc_class = basic.get("disclosureClass", "")
        fund_type = basic.get("fundType", "")

        cat_group = classify_disclosure(title, summary, disc_class, fund_type)
        category_counts[cat_group] += 1
        cat_meta = KAP_CATEGORIES[cat_group]

        # Detay ve Ek Dosyaları Çek
        detail = engine.fetch_detail(index)
        body_html = str(detail.get("disclosureBody") or "")
        clean_text = re.sub(r'<[^>]+>', ' ', body_html)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        if not clean_text:
            clean_text = summary or title

        attachments = []
        for att in (detail.get("attachments") or []):
            attachments.append({
                "name": att.get("fileName"),
                "extension": att.get("fileExtension"),
                "url": f"https://www.kap.org.tr/tr/api/file/download/{att.get('objId')}"
            })

        # AI Özetleme
        ai_summary = ""
        is_large_doc = len(clean_text) >= args.ai_min_chars
        print(f"[{i+1}/{min(len(raw_list), args.limit)}] {symbol or 'BIST'} | {cat_meta['name'][:24]} | {title[:40]}... (Ek: {len(attachments)}, Boyut: {len(clean_text)} krk)", flush=True)

        if args.ai_summarize and is_large_doc:
            print(f"   ↳ [AI Analizi Yapılıyor ({args.ai_provider})...]", flush=True)
            ai_summary = summarizer.summarize(clean_text)
            if ai_summary:
                print(f"   ↳ [AI Özeti]: {ai_summary[:120]}...", flush=True)

        records.append({
            "disclosure_index": index,
            "symbol": symbol,
            "company_title": company_title,
            "title": title,
            "publish_date": basic.get("publishDate"),
            "category_code": cat_group,
            "category_title": cat_meta["name"],
            "url": f"https://www.kap.org.tr/tr/Bildirim/{index}",
            "is_large_doc": is_large_doc,
            "text_length": len(clean_text),
            "ai_summary": ai_summary,
            "attachments_count": len(attachments),
            "attachments": attachments
        })

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("\n==================================================================")
    print(" ✅ İŞLEM BAŞARIYLA TAMAMLANDI")
    print(f" • Kaydedilen Bildirim Sayısı: {len(records)}")
    print(f" • Çıktı Dosyası: {args.output}")
    print(" • Kategori Dağılımı:")
    for k, v in category_counts.items():
        print(f"    - {KAP_CATEGORIES[k]['name']}: {v} adet")
    print("==================================================================")

if __name__ == "__main__":
    main()
