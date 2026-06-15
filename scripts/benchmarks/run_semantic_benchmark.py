#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Study Hub - Semantic Search Benchmark Runner

Cách dùng nhanh:
1) Đảm bảo backend/frontend proxy đang chạy.
2) Sửa BASE_URL và DOCUMENT_ID nếu cần.
3) Chạy:
   python run_semantic_benchmark.py

Output:
- semantic_benchmark_results.csv
- semantic_benchmark_results.json
"""

import csv
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from pathlib import Path
import requests


# ====== CONFIG ======
BASE_URL = "http://localhost:3001/api/documents/semantic-search"
DOCUMENT_ID = 18
TOP_K = 10
TIMEOUT_SECONDS = 30

# Nếu API của bạn cần Authorization thì điền token ở đây.
# Ví dụ: AUTH_TOKEN = "eyJhbGciOi..."
AUTH_TOKEN = ""

# Nếu không cần cookie thì để trống. Không khuyến khích hard-code cookie.
COOKIES = {}
# ====================


BENCHMARKS = [
    {
        "id": "Q01",
        "query": "HTTP 401",
        "expected": "Chunk 13 hoặc section LIME-ANCHOR / HTTP 401, 403, 404",
        "must_contain_any": ["LIME-ANCHOR", "HTTP 401", "401 nghĩa", "401 liên quan đăng nhập"],
    },
    {
        "id": "Q02",
        "query": "đã đăng nhập nhưng thiếu quyền",
        "expected": "Chunk 13 hoặc Chunk 41 / HTTP 403 thiếu quyền",
        "must_contain_any": ["403", "thiếu quyền", "LIME-ANCHOR"],
    },
    {
        "id": "Q03",
        "query": "đã đăng nhập nhưng bị chặn vì thiếu quyền",
        "expected": "Chunk 13 / HTTP 403 khác 401",
        "must_contain_any": ["403 khác 401", "bị chặn vì thiếu quyền", "LIME-ANCHOR"],
    },
    {
        "id": "Q04",
        "query": "TURQUOISE-SEAL",
        "expected": "Chunk bảng chứa TURQUOISE-SEAL hoặc ARCHIVED_TEMP",
        "must_contain_any": ["TURQUOISE-SEAL", "ARCHIVED_TEMP"],
    },
    {
        "id": "Q05",
        "query": "tài liệu bị ẩn tạm thời trong 7 ngày trước khi xóa vĩnh viễn",
        "expected": "Chunk bảng ARCHIVED_TEMP",
        "must_contain_any": ["ARCHIVED_TEMP", "ẩn tạm thời trong 7 ngày", "xóa vĩnh viễn"],
    },
    {
        "id": "Q06",
        "query": "tại sao tăng top-k vẫn sai",
        "expected": "Chunk ECHO-PEBBLE / top-k-similarity",
        "must_contain_any": ["ECHO-PEBBLE", "top-k", "threshold", "metadata filter"],
    },
    {
        "id": "Q07",
        "query": "xóa rồi search vẫn ra",
        "expected": "Chunk XENON-OTTER / delete-cleanup",
        "must_contain_any": ["XENON-OTTER", "delete-cleanup", "xóa vectors", "vector database"],
    },
    {
        "id": "Q08",
        "query": "dictionary có sắp xếp theo key không",
        "expected": "Chunk MICA-DRAGON / Python dictionary",
        "must_contain_any": ["MICA-DRAGON", "dictionary", "không tự động sắp"],
    },
    {
        "id": "Q09",
        "query": "role khác ownership thế nào",
        "expected": "Chunk CERULEAN-MOTH / role-permission",
        "must_contain_any": ["CERULEAN-MOTH", "role", "ownership"],
    },
    {
        "id": "Q10",
        "query": "lưu tài liệu người khác vào thư viện",
        "expected": "Chunk IVORY-TURTLE / Save to Library",
        "must_contain_any": ["IVORY-TURTLE", "Save to Library", "library-save"],
    },
    {
        "id": "Q11",
        "query": "file upload rồi sao tìm nội dung chưa ra",
        "expected": "Chunk ALPHA-RIVER / upload pipeline",
        "must_contain_any": ["ALPHA-RIVER", "upload-pipeline", "chưa chứng minh vector search"],
    },
    {
        "id": "Q12",
        "query": "overlap bao nhiêu để không mất ngữ cảnh",
        "expected": "Chunk COBALT-LANTERN / chunking overlap",
        "must_contain_any": ["COBALT-LANTERN", "overlap", "100", "150"],
    },
    {
        "id": "Q13",
        "query": "embedding có phải tokenization không",
        "expected": "Chunk DELTA-ORCHID / embedding vs tokenization",
        "must_contain_any": ["DELTA-ORCHID", "embedding", "tokenization"],
    },
    {
        "id": "Q14",
        "query": "Pinecone tìm đúng nhưng user không có quyền thì sao",
        "expected": "Chunk FALCON-MANGO / metadata filter permission",
        "must_contain_any": ["FALCON-MANGO", "metadata-filter", "quyền truy cập"],
    },
    {
        "id": "Q15",
        "query": "tại sao cần lưu pageNumber hoặc charStart",
        "expected": "Chunk GARNET-CAPYBARA / citation mapping",
        "must_contain_any": ["GARNET-CAPYBARA", "page-citation", "charStart"],
    },
    {
        "id": "Q16",
        "query": "link cộng tác upload khác gì share link",
        "expected": "Chunk HARBOR-LOTUS / sharing model",
        "must_contain_any": ["HARBOR-LOTUS", "sharing-model", "upload link", "share link"],
    },
    {
        "id": "Q17",
        "query": "trạng thái nào mới cho search nội dung",
        "expected": "Chunk JASPER-CLOUD hoặc bảng PROCESSED",
        "must_contain_any": ["JASPER-CLOUD", "PROCESSED", "đủ điều kiện"],
    },
    {
        "id": "Q18",
        "query": "đăng nhập Google rồi có cần JWT không",
        "expected": "Chunk KESTREL-MOON / OAuth vs JWT",
        "must_contain_any": ["KESTREL-MOON", "OAuth", "JWT"],
    },
    {
        "id": "Q19",
        "query": "loại sinh viên trùng bằng cấu trúc nào",
        "expected": "Chunk NOVA-CANYON / Python set",
        "must_contain_any": ["NOVA-CANYON", "python-set", "loại trùng"],
    },
    {
        "id": "Q20",
        "query": "Python có cần file public không",
        "expected": "Chunk OCEAN-SAFFRON / storage security",
        "must_contain_any": ["OCEAN-SAFFRON", "storage-security", "public URL", "signed URL"],
    },
    {
        "id": "Q21",
        "query": "search title khác search trong nội dung thế nào",
        "expected": "Chunk PINE-BAMBOO / hybrid search",
        "must_contain_any": ["PINE-BAMBOO", "hybrid-search", "MySQL", "Pinecone"],
    },
    {
        "id": "Q22",
        "query": "09:30-11:00 có trùng 08:00-10:00 không",
        "expected": "Chunk QUARTZ-GECKO / schedule conflict",
        "must_contain_any": ["QUARTZ-GECKO", "schedule-conflict", "trùng"],
    },
    {
        "id": "Q23",
        "query": "quantity 3 minStock 5 có cảnh báo không",
        "expected": "Chunk RUBY-MEADOW / low stock",
        "must_contain_any": ["RUBY-MEADOW", "inventory-low-stock", "quantity 3", "minStock 5"],
    },
    {
        "id": "Q24",
        "query": "actor nào xử lý thực địa",
        "expected": "Chunk SILVER-PANDA / SnakeGuard",
        "must_contain_any": ["SILVER-PANDA", "SnakeGuard", "đội cứu hộ", "xử lý thực địa"],
    },
    {
        "id": "Q25",
        "query": "lỗi AI service sửa rồi có cần upload lại không",
        "expected": "Chunk TIGER-NECTAR / retry processing",
        "must_contain_any": ["TIGER-NECTAR", "retry-processing", "Retry khác re-upload"],
    },
    {
        "id": "Q26",
        "query": "inline khác attachment thế nào",
        "expected": "Chunk UMBER-KOALA / preview download",
        "must_contain_any": ["UMBER-KOALA", "inline", "attachment", "preview"],
    },
    {
        "id": "Q27",
        "query": "nhiều đoạn đều giống nhau thì chọn đoạn nào",
        "expected": "Chunk VIOLET-RAVEN / reranking",
        "must_contain_any": ["VIOLET-RAVEN", "reranking", "chọn ứng viên"],
    },
    {
        "id": "Q28",
        "query": "RAG tốt phải biết từ chối khi nào",
        "expected": "Chunk WILLOW-SEAHORSE hoặc ELM-FOX / no answer",
        "must_contain_any": ["WILLOW-SEAHORSE", "ELM-FOX", "không tìm thấy", "không chứa câu trả lời"],
    },
    {
        "id": "Q29",
        "query": "ZINC-WHALE nói về điều gì",
        "expected": "Chunk ZINC-WHALE / rare-code-testing",
        "must_contain_any": ["ZINC-WHALE", "rare-code-testing", "mã hiếm"],
    },
    {
        "id": "Q30",
        "query": "cơ chế nào xóa file khi bị từ chối",
        "expected": "Chunk AMBER-FINCH / Bloom Gate",
        "must_contain_any": ["AMBER-FINCH", "Bloom Gate", "reject", "bị từ chối"],
    },
    {
        "id": "Q31",
        "query": "quy tắc nào dùng khi similarity thấp",
        "expected": "Chunk BASIL-SQUID / Mercury Lantern",
        "must_contain_any": ["BASIL-SQUID", "Mercury Lantern", "similarity thấp"],
    },
    {
        "id": "Q32",
        "query": "dữ kiện chỉ nằm trong bảng thì extractor cần làm gì",
        "expected": "Chunk DUNE-LEMUR / table extraction",
        "must_contain_any": ["DUNE-LEMUR", "table-extraction", "đọc cả bảng", "cell text"],
    },
    {
        "id": "Q33",
        "query": "test RAG cần đo những gì",
        "expected": "Chunk FERN-BADGER / manual evaluation",
        "must_contain_any": ["FERN-BADGER", "manual-evaluation", "retrieval accuracy", "answer accuracy"],
    },
]


def get_first_present(d: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
    for key in keys:
        if key in d and d[key] is not None:
            return d[key]
    return default


def normalize_results(payload: Any) -> List[Dict[str, Any]]:
    """
    Tries to handle common response shapes:
    - [result, result]
    - {"results": [...]}
    - {"data": [...]}
    - {"content": [...]}
    """
    if isinstance(payload, list):
        return payload

    if isinstance(payload, dict):
        for key in ["results", "data", "content", "items"]:
            value = payload.get(key)
            if isinstance(value, list):
                return value

    raise ValueError(f"Cannot find result list in response shape: {type(payload)} {str(payload)[:300]}")


def extract_text(result: Dict[str, Any]) -> str:
    return str(get_first_present(result, [
        "chunkText", "text", "content", "preview", "snippet", "chunk", "body"
    ], ""))


def extract_chunk_index(result: Dict[str, Any]) -> Any:
    return get_first_present(result, ["chunkIndex", "chunk_index", "chunkId", "chunk"], "")


def extract_score(result: Dict[str, Any]) -> Any:
    return get_first_present(result, ["score", "baseScore", "similarityScore"], "")


def extract_final_score(result: Dict[str, Any]) -> Any:
    return get_first_present(result, ["finalScore", "rerankScore", "score"], "")


def extract_source(result: Dict[str, Any]) -> Any:
    return get_first_present(result, ["source", "resultSource", "type"], "")


def hit(text: str, expected_terms: List[str]) -> bool:
    lower = text.lower()
    return any(term.lower() in lower for term in expected_terms)


def call_search(query: str) -> List[Dict[str, Any]]:
    params = {
        "query": query,
        "topK": TOP_K,
        "documentId": DOCUMENT_ID,
    }

    headers = {
        "Accept": "application/json",
    }

    if AUTH_TOKEN.strip():
        headers["Authorization"] = f"Bearer {AUTH_TOKEN.strip()}"

    response = requests.get(
        BASE_URL,
        params=params,
        headers=headers,
        cookies=COOKIES,
        timeout=TIMEOUT_SECONDS,
    )

    response.raise_for_status()
    payload = response.json()
    return normalize_results(payload)


def main() -> None:
    rows = []
    raw_output = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "base_url": BASE_URL,
        "document_id": DOCUMENT_ID,
        "top_k": TOP_K,
        "results": [],
    }

    pass_at_1 = 0
    pass_at_3 = 0
    pass_at_5 = 0

    print(f"Running benchmark: {len(BENCHMARKS)} queries")
    print(f"BASE_URL={BASE_URL}")
    print(f"DOCUMENT_ID={DOCUMENT_ID}, TOP_K={TOP_K}")
    print("-" * 80)

    for idx, bench in enumerate(BENCHMARKS, start=1):
        query = bench["query"]
        print(f"[{idx:02d}/{len(BENCHMARKS)}] {bench['id']} - {query}")

        try:
            results = call_search(query)
            top_texts = [extract_text(r) for r in results]

            top1_text = top_texts[0] if len(top_texts) >= 1 else ""
            top3_text = "\n".join(top_texts[:3])
            top5_text = "\n".join(top_texts[:5])

            p1 = hit(top1_text, bench["must_contain_any"])
            p3 = hit(top3_text, bench["must_contain_any"])
            p5 = hit(top5_text, bench["must_contain_any"])

            pass_at_1 += int(p1)
            pass_at_3 += int(p3)
            pass_at_5 += int(p5)

            top1 = results[0] if results else {}
            top2 = results[1] if len(results) > 1 else {}
            top3 = results[2] if len(results) > 2 else {}

            row = {
                "id": bench["id"],
                "query": query,
                "expected": bench["expected"],
                "must_contain_any": " | ".join(bench["must_contain_any"]),
                "pass_at_1": "YES" if p1 else "NO",
                "pass_at_3": "YES" if p3 else "NO",
                "pass_at_5": "YES" if p5 else "NO",
                "top1_chunk": extract_chunk_index(top1),
                "top1_score": extract_score(top1),
                "top1_final_score": extract_final_score(top1),
                "top1_source": extract_source(top1),
                "top1_text": extract_text(top1)[:500],
                "top2_chunk": extract_chunk_index(top2),
                "top2_text": extract_text(top2)[:300],
                "top3_chunk": extract_chunk_index(top3),
                "top3_text": extract_text(top3)[:300],
                "error": "",
            }

            rows.append(row)

            raw_output["results"].append({
                "benchmark": bench,
                "pass_at_1": p1,
                "pass_at_3": p3,
                "pass_at_5": p5,
                "raw_results": results,
            })

            print(f"  Pass@1={row['pass_at_1']} Pass@3={row['pass_at_3']} Top1Chunk={row['top1_chunk']}")

        except Exception as exc:
            row = {
                "id": bench["id"],
                "query": query,
                "expected": bench["expected"],
                "must_contain_any": " | ".join(bench["must_contain_any"]),
                "pass_at_1": "ERROR",
                "pass_at_3": "ERROR",
                "pass_at_5": "ERROR",
                "top1_chunk": "",
                "top1_score": "",
                "top1_final_score": "",
                "top1_source": "",
                "top1_text": "",
                "top2_chunk": "",
                "top2_text": "",
                "top3_chunk": "",
                "top3_text": "",
                "error": repr(exc),
            }
            rows.append(row)
            raw_output["results"].append({
                "benchmark": bench,
                "error": repr(exc),
            })
            print(f"  ERROR: {exc}")

        time.sleep(0.15)

    total = len(BENCHMARKS)
    print("-" * 80)
    print(f"Pass@1: {pass_at_1}/{total} = {pass_at_1 / total:.1%}")
    print(f"Pass@3: {pass_at_3}/{total} = {pass_at_3 / total:.1%}")
    print(f"Pass@5: {pass_at_5}/{total} = {pass_at_5 / total:.1%}")

    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    OUTPUT_DIR = PROJECT_ROOT / "docs" / "benchmarks" / "semantic-search"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    csv_path = OUTPUT_DIR / f"semantic_benchmark_results_{timestamp}.csv"
    json_path = OUTPUT_DIR / f"semantic_benchmark_results_{timestamp}.json"

    fieldnames = list(rows[0].keys()) if rows else []
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(raw_output, f, ensure_ascii=False, indent=2)

    print(f"Saved: {csv_path}")
    print(f"Saved: {json_path}")


if __name__ == "__main__":
    main()
