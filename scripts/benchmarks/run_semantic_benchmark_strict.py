#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Study Hub - Semantic Search Strict Benchmark Runner

What this script does:
- Runs semantic search benchmark queries against your local API.
- Calculates both:
  1) Soft Pass@K: checks whether top results contain expected keywords.
  2) Strict Pass@K: checks whether top results include expected chunkIndex values.

Recommended command from project root:
    python scripts/benchmarks/run_semantic_benchmark_strict.py

Output directory:
    docs/benchmarks/semantic-search/

Output files:
    semantic_benchmark_strict_results_YYYYMMDD_HHMMSS.csv
    semantic_benchmark_strict_results_YYYYMMDD_HHMMSS.json
"""

import csv
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import requests


# ====== CONFIG ======
BASE_URL = "http://localhost:3001/api/documents/semantic-search"
DOCUMENT_ID = 18
TOP_K = 10
TIMEOUT_SECONDS = 30

# If your API needs Authorization, put token here.
# Example: AUTH_TOKEN = "eyJhbGciOi..."
AUTH_TOKEN = ""

# Usually not needed for this local benchmark.
COOKIES = {}
# ====================


BENCHMARKS = [
    {
        "id": "Q01",
        "query": "HTTP 401",
        "expected": "HTTP 401/403/404 section, especially LIME-ANCHOR",
        "expected_chunk_indices": [13, 41],
        "must_contain_any": ["LIME-ANCHOR", "HTTP 401", "401 nghĩa", "401 liên quan đăng nhập"],
    },
    {
        "id": "Q02",
        "query": "đã đăng nhập nhưng thiếu quyền",
        "expected": "HTTP 403 thiếu quyền, LIME-ANCHOR or HTTP table",
        "expected_chunk_indices": [13, 41],
        "must_contain_any": ["403", "thiếu quyền", "LIME-ANCHOR"],
    },
    {
        "id": "Q03",
        "query": "đã đăng nhập nhưng bị chặn vì thiếu quyền",
        "expected": "LIME-ANCHOR section explaining 403 vs 401",
        "expected_chunk_indices": [13],
        "must_contain_any": ["403 khác 401", "bị chặn vì thiếu quyền", "LIME-ANCHOR"],
    },
    {
        "id": "Q04",
        "query": "TURQUOISE-SEAL",
        "expected": "Actual table chunks containing TURQUOISE-SEAL / ARCHIVED_TEMP, not only checklist",
        "expected_chunk_indices": [40, 41],
        "must_contain_any": ["TURQUOISE-SEAL", "ARCHIVED_TEMP"],
    },
    {
        "id": "Q05",
        "query": "tài liệu bị ẩn tạm thời trong 7 ngày trước khi xóa vĩnh viễn",
        "expected": "ARCHIVED_TEMP table row",
        "expected_chunk_indices": [40, 41],
        "must_contain_any": ["ARCHIVED_TEMP", "ẩn tạm thời trong 7 ngày", "xóa vĩnh viễn"],
    },
    {
        "id": "Q06",
        "query": "tại sao tăng top-k vẫn sai",
        "expected": "ECHO-PEBBLE / top-k-similarity section",
        "expected_chunk_indices": [5, 6],
        "must_contain_any": ["ECHO-PEBBLE", "top-k", "threshold", "metadata filter"],
    },
    {
        "id": "Q07",
        "query": "xóa rồi search vẫn ra",
        "expected": "XENON-OTTER / delete-cleanup section",
        "expected_chunk_indices": [26, 27],
        "must_contain_any": ["XENON-OTTER", "delete-cleanup", "xóa vectors", "vector database"],
    },
    {
        "id": "Q08",
        "query": "dictionary có sắp xếp theo key không",
        "expected": "MICA-DRAGON / Python dictionary section",
        "expected_chunk_indices": [14, 15],
        "must_contain_any": ["MICA-DRAGON", "dictionary", "không tự động sắp"],
    },
    {
        "id": "Q09",
        "query": "role khác ownership thế nào",
        "expected": "CERULEAN-MOTH / role-permission section",
        "expected_chunk_indices": [32, 33],
        "must_contain_any": ["CERULEAN-MOTH", "role", "ownership"],
    },
    {
        "id": "Q10",
        "query": "lưu tài liệu người khác vào thư viện",
        "expected": "IVORY-TURTLE / Save to Library section",
        "expected_chunk_indices": [9, 10],
        "must_contain_any": ["IVORY-TURTLE", "Save to Library", "library-save"],
    },
    {
        "id": "Q11",
        "query": "file upload rồi sao tìm nội dung chưa ra",
        "expected": "ALPHA-RIVER / upload pipeline section",
        "expected_chunk_indices": [0, 1, 2],
        "must_contain_any": ["ALPHA-RIVER", "upload-pipeline", "chưa chứng minh vector search"],
    },
    {
        "id": "Q12",
        "query": "overlap bao nhiêu để không mất ngữ cảnh",
        "expected": "COBALT-LANTERN / chunking overlap section",
        "expected_chunk_indices": [2, 3],
        "must_contain_any": ["COBALT-LANTERN", "overlap", "100", "150"],
    },
    {
        "id": "Q13",
        "query": "embedding có phải tokenization không",
        "expected": "DELTA-ORCHID / embedding vs tokenization section",
        "expected_chunk_indices": [3, 4],
        "must_contain_any": ["DELTA-ORCHID", "embedding", "tokenization"],
    },
    {
        "id": "Q14",
        "query": "Pinecone tìm đúng nhưng user không có quyền thì sao",
        "expected": "FALCON-MANGO / metadata filter permission section",
        "expected_chunk_indices": [5, 6, 7],
        "must_contain_any": ["FALCON-MANGO", "metadata-filter", "quyền truy cập"],
    },
    {
        "id": "Q15",
        "query": "tại sao cần lưu pageNumber hoặc charStart",
        "expected": "GARNET-CAPYBARA / citation mapping section",
        "expected_chunk_indices": [7, 8],
        "must_contain_any": ["GARNET-CAPYBARA", "page-citation", "charStart"],
    },
    {
        "id": "Q16",
        "query": "link cộng tác upload khác gì share link",
        "expected": "HARBOR-LOTUS / sharing model section",
        "expected_chunk_indices": [8, 9],
        "must_contain_any": ["HARBOR-LOTUS", "sharing-model", "upload link", "share link"],
    },
    {
        "id": "Q17",
        "query": "trạng thái nào mới cho search nội dung",
        "expected": "JASPER-CLOUD or actual status table with PROCESSED",
        "expected_chunk_indices": [11, 40, 41],
        "must_contain_any": ["JASPER-CLOUD", "PROCESSED", "đủ điều kiện"],
    },
    {
        "id": "Q18",
        "query": "đăng nhập Google rồi có cần JWT không",
        "expected": "KESTREL-MOON / OAuth vs JWT section",
        "expected_chunk_indices": [12, 13],
        "must_contain_any": ["KESTREL-MOON", "OAuth", "JWT"],
    },
    {
        "id": "Q19",
        "query": "loại sinh viên trùng bằng cấu trúc nào",
        "expected": "NOVA-CANYON / Python set section",
        "expected_chunk_indices": [15, 16],
        "must_contain_any": ["NOVA-CANYON", "python-set", "loại trùng"],
    },
    {
        "id": "Q20",
        "query": "Python có cần file public không",
        "expected": "OCEAN-SAFFRON / storage security section",
        "expected_chunk_indices": [16, 17],
        "must_contain_any": ["OCEAN-SAFFRON", "storage-security", "public URL", "signed URL"],
    },
    {
        "id": "Q21",
        "query": "search title khác search trong nội dung thế nào",
        "expected": "PINE-BAMBOO / hybrid search section",
        "expected_chunk_indices": [17, 18],
        "must_contain_any": ["PINE-BAMBOO", "hybrid-search", "MySQL", "Pinecone"],
    },
    {
        "id": "Q22",
        "query": "09:30-11:00 có trùng 08:00-10:00 không",
        "expected": "QUARTZ-GECKO / schedule conflict section",
        "expected_chunk_indices": [19],
        "must_contain_any": ["QUARTZ-GECKO", "schedule-conflict", "trùng"],
    },
    {
        "id": "Q23",
        "query": "quantity 3 minStock 5 có cảnh báo không",
        "expected": "RUBY-MEADOW / low stock section",
        "expected_chunk_indices": [20],
        "must_contain_any": ["RUBY-MEADOW", "inventory-low-stock", "quantity 3", "minStock 5"],
    },
    {
        "id": "Q24",
        "query": "actor nào xử lý thực địa",
        "expected": "SILVER-PANDA / SnakeGuard section",
        "expected_chunk_indices": [20, 21],
        "must_contain_any": ["SILVER-PANDA", "SnakeGuard", "đội cứu hộ", "xử lý thực địa"],
    },
    {
        "id": "Q25",
        "query": "lỗi AI service sửa rồi có cần upload lại không",
        "expected": "TIGER-NECTAR / retry processing section",
        "expected_chunk_indices": [22],
        "must_contain_any": ["TIGER-NECTAR", "retry-processing", "Retry khác re-upload"],
    },
    {
        "id": "Q26",
        "query": "inline khác attachment thế nào",
        "expected": "UMBER-KOALA / preview download section",
        "expected_chunk_indices": [23, 24],
        "must_contain_any": ["UMBER-KOALA", "inline", "attachment", "preview"],
    },
    {
        "id": "Q27",
        "query": "nhiều đoạn đều giống nhau thì chọn đoạn nào",
        "expected": "VIOLET-RAVEN / reranking section",
        "expected_chunk_indices": [24, 25],
        "must_contain_any": ["VIOLET-RAVEN", "reranking", "chọn ứng viên"],
    },
    {
        "id": "Q28",
        "query": "RAG tốt phải biết từ chối khi nào",
        "expected": "WILLOW-SEAHORSE or ELM-FOX / no answer section",
        "expected_chunk_indices": [25, 26],
        "must_contain_any": ["WILLOW-SEAHORSE", "ELM-FOX", "không tìm thấy", "không chứa câu trả lời"],
    },
    {
        "id": "Q29",
        "query": "ZINC-WHALE nói về điều gì",
        "expected": "ZINC-WHALE / rare-code-testing section",
        "expected_chunk_indices": [28, 29],
        "must_contain_any": ["ZINC-WHALE", "rare-code-testing", "mã hiếm"],
    },
    {
        "id": "Q30",
        "query": "cơ chế nào xóa file khi bị từ chối",
        "expected": "AMBER-FINCH / Bloom Gate section",
        "expected_chunk_indices": [29, 30],
        "must_contain_any": ["AMBER-FINCH", "Bloom Gate", "reject", "bị từ chối"],
    },
    {
        "id": "Q31",
        "query": "quy tắc nào dùng khi similarity thấp",
        "expected": "BASIL-SQUID / Mercury Lantern section",
        "expected_chunk_indices": [31, 32],
        "must_contain_any": ["BASIL-SQUID", "Mercury Lantern", "similarity thấp"],
    },
    {
        "id": "Q32",
        "query": "dữ kiện chỉ nằm trong bảng thì extractor cần làm gì",
        "expected": "DUNE-LEMUR / table extraction section",
        "expected_chunk_indices": [33, 34],
        "must_contain_any": ["DUNE-LEMUR", "table-extraction", "đọc cả bảng", "cell text"],
    },
    {
        "id": "Q33",
        "query": "test RAG cần đo những gì",
        "expected": "FERN-BADGER / manual evaluation section",
        "expected_chunk_indices": [35, 36],
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
    Handles common response shapes:
    - [result, result]
    - {"results": [...]}
    - {"data": [...]}
    - {"content": [...]}
    - {"items": [...]}
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


def soft_hit(text: str, expected_terms: List[str]) -> bool:
    lower = text.lower()
    return any(term.lower() in lower for term in expected_terms)


def strict_hit(results: List[Dict[str, Any]], expected_chunk_indices: List[int], top_n: int) -> bool:
    if not expected_chunk_indices:
        return False

    expected = set(expected_chunk_indices)

    for result in results[:top_n]:
        chunk_index = extract_chunk_index(result)

        try:
            chunk_index = int(chunk_index)
        except (TypeError, ValueError):
            continue

        if chunk_index in expected:
            return True

    return False


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


def make_output_dir() -> Path:
    """
    Script location expected:
        project_root/scripts/benchmarks/run_semantic_benchmark_strict.py

    parents[0] = scripts/benchmarks
    parents[1] = scripts
    parents[2] = project root
    """
    project_root = Path(__file__).resolve().parents[2]
    output_dir = project_root / "docs" / "benchmarks" / "semantic-search"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def main() -> None:
    rows = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = make_output_dir()

    raw_output = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "base_url": BASE_URL,
        "document_id": DOCUMENT_ID,
        "top_k": TOP_K,
        "mode": "soft_and_strict",
        "results": [],
    }

    soft_pass_at_1 = 0
    soft_pass_at_3 = 0
    soft_pass_at_5 = 0

    strict_pass_at_1 = 0
    strict_pass_at_3 = 0
    strict_pass_at_5 = 0

    error_count = 0

    print(f"Running strict benchmark: {len(BENCHMARKS)} queries")
    print(f"BASE_URL={BASE_URL}")
    print(f"DOCUMENT_ID={DOCUMENT_ID}, TOP_K={TOP_K}")
    print(f"OUTPUT_DIR={output_dir}")
    print("-" * 100)

    for idx, bench in enumerate(BENCHMARKS, start=1):
        query = bench["query"]
        expected_chunk_indices = bench.get("expected_chunk_indices", [])
        print(f"[{idx:02d}/{len(BENCHMARKS)}] {bench['id']} - {query}")

        try:
            results = call_search(query)

            top_texts = [extract_text(r) for r in results]
            top1_text = top_texts[0] if len(top_texts) >= 1 else ""
            top3_text = "\n".join(top_texts[:3])
            top5_text = "\n".join(top_texts[:5])

            soft_p1 = soft_hit(top1_text, bench["must_contain_any"])
            soft_p3 = soft_hit(top3_text, bench["must_contain_any"])
            soft_p5 = soft_hit(top5_text, bench["must_contain_any"])

            strict_p1 = strict_hit(results, expected_chunk_indices, 1)
            strict_p3 = strict_hit(results, expected_chunk_indices, 3)
            strict_p5 = strict_hit(results, expected_chunk_indices, 5)

            soft_pass_at_1 += int(soft_p1)
            soft_pass_at_3 += int(soft_p3)
            soft_pass_at_5 += int(soft_p5)

            strict_pass_at_1 += int(strict_p1)
            strict_pass_at_3 += int(strict_p3)
            strict_pass_at_5 += int(strict_p5)

            top1 = results[0] if results else {}
            top2 = results[1] if len(results) > 1 else {}
            top3 = results[2] if len(results) > 2 else {}

            row = {
                "id": bench["id"],
                "query": query,
                "expected": bench["expected"],
                "expected_chunk_indices": ",".join(map(str, expected_chunk_indices)),
                "must_contain_any": " | ".join(bench["must_contain_any"]),

                "soft_pass_at_1": "YES" if soft_p1 else "NO",
                "soft_pass_at_3": "YES" if soft_p3 else "NO",
                "soft_pass_at_5": "YES" if soft_p5 else "NO",

                "strict_pass_at_1": "YES" if strict_p1 else "NO",
                "strict_pass_at_3": "YES" if strict_p3 else "NO",
                "strict_pass_at_5": "YES" if strict_p5 else "NO",

                "top1_chunk": extract_chunk_index(top1),
                "top1_score": extract_score(top1),
                "top1_final_score": extract_final_score(top1),
                "top1_source": extract_source(top1),
                "top1_text": extract_text(top1)[:500],

                "top2_chunk": extract_chunk_index(top2),
                "top2_score": extract_score(top2),
                "top2_final_score": extract_final_score(top2),
                "top2_text": extract_text(top2)[:300],

                "top3_chunk": extract_chunk_index(top3),
                "top3_score": extract_score(top3),
                "top3_final_score": extract_final_score(top3),
                "top3_text": extract_text(top3)[:300],

                "error": "",
            }

            rows.append(row)

            raw_output["results"].append({
                "benchmark": bench,
                "soft_pass_at_1": soft_p1,
                "soft_pass_at_3": soft_p3,
                "soft_pass_at_5": soft_p5,
                "strict_pass_at_1": strict_p1,
                "strict_pass_at_3": strict_p3,
                "strict_pass_at_5": strict_p5,
                "raw_results": results,
            })

            print(
                f"  Soft@1={row['soft_pass_at_1']} Soft@3={row['soft_pass_at_3']} "
                f"Strict@1={row['strict_pass_at_1']} Strict@3={row['strict_pass_at_3']} "
                f"Expected={row['expected_chunk_indices']} Top1={row['top1_chunk']}"
            )

        except Exception as exc:
            error_count += 1
            row = {
                "id": bench["id"],
                "query": query,
                "expected": bench["expected"],
                "expected_chunk_indices": ",".join(map(str, bench.get("expected_chunk_indices", []))),
                "must_contain_any": " | ".join(bench["must_contain_any"]),
                "soft_pass_at_1": "ERROR",
                "soft_pass_at_3": "ERROR",
                "soft_pass_at_5": "ERROR",
                "strict_pass_at_1": "ERROR",
                "strict_pass_at_3": "ERROR",
                "strict_pass_at_5": "ERROR",
                "top1_chunk": "",
                "top1_score": "",
                "top1_final_score": "",
                "top1_source": "",
                "top1_text": "",
                "top2_chunk": "",
                "top2_score": "",
                "top2_final_score": "",
                "top2_text": "",
                "top3_chunk": "",
                "top3_score": "",
                "top3_final_score": "",
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
    successful_total = total - error_count

    print("-" * 100)

    if successful_total > 0:
        print(f"Soft Pass@1:   {soft_pass_at_1}/{successful_total} = {soft_pass_at_1 / successful_total:.1%}")
        print(f"Soft Pass@3:   {soft_pass_at_3}/{successful_total} = {soft_pass_at_3 / successful_total:.1%}")
        print(f"Soft Pass@5:   {soft_pass_at_5}/{successful_total} = {soft_pass_at_5 / successful_total:.1%}")

        print(f"Strict Pass@1: {strict_pass_at_1}/{successful_total} = {strict_pass_at_1 / successful_total:.1%}")
        print(f"Strict Pass@3: {strict_pass_at_3}/{successful_total} = {strict_pass_at_3 / successful_total:.1%}")
        print(f"Strict Pass@5: {strict_pass_at_5}/{successful_total} = {strict_pass_at_5 / successful_total:.1%}")
    else:
        print("No successful benchmark queries.")

    if error_count:
        print(f"Errors: {error_count}/{total}")

    raw_output["summary"] = {
        "total": total,
        "successful_total": successful_total,
        "error_count": error_count,
        "soft_pass_at_1": soft_pass_at_1,
        "soft_pass_at_3": soft_pass_at_3,
        "soft_pass_at_5": soft_pass_at_5,
        "strict_pass_at_1": strict_pass_at_1,
        "strict_pass_at_3": strict_pass_at_3,
        "strict_pass_at_5": strict_pass_at_5,
        "soft_pass_at_1_rate": soft_pass_at_1 / successful_total if successful_total else 0,
        "soft_pass_at_3_rate": soft_pass_at_3 / successful_total if successful_total else 0,
        "soft_pass_at_5_rate": soft_pass_at_5 / successful_total if successful_total else 0,
        "strict_pass_at_1_rate": strict_pass_at_1 / successful_total if successful_total else 0,
        "strict_pass_at_3_rate": strict_pass_at_3 / successful_total if successful_total else 0,
        "strict_pass_at_5_rate": strict_pass_at_5 / successful_total if successful_total else 0,
    }

    csv_path = output_dir / f"semantic_benchmark_strict_results_{timestamp}.csv"
    json_path = output_dir / f"semantic_benchmark_strict_results_{timestamp}.json"

    fieldnames = list(rows[0].keys()) if rows else []
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(raw_output, f, ensure_ascii=False, indent=2)

    print(f"Saved CSV:  {csv_path}")
    print(f"Saved JSON: {json_path}")


if __name__ == "__main__":
    main()
