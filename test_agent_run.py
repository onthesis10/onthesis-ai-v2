"""
test_agent_run.py — E2E test for POST /api/agent/run SSE endpoint
Sends a sample thesis editing task and validates SSE event stream.
Usage: python test_agent_run.py (with server running on localhost:5000)
"""

import requests
import json
import time
import sys

BASE_URL = "http://127.0.0.1:5000/api/agent/run"

# ── Sample context simulating frontend ContextBuilder output ──
SAMPLE_CONTEXT = {
    "context_title": "Implementasi Machine Learning untuk Prediksi Kelulusan Mahasiswa",
    "context_problem": "Bagaimana penerapan algoritma Random Forest dapat memprediksi kelulusan mahasiswa?",
    "context_method": "Metode kuantitatif dengan pendekatan machine learning",
    "active_paragraphs": [
        {
            "paraId": "P-abc001",
            "content": "Pendidikan tinggi di Indonesia mengalami perkembangan yang sangat pesat dalam beberapa tahun terakhir."
        },
        {
            "paraId": "P-abc002",
            "content": "Teknologi informasi yang sangat berkembang pesat bikin banyak universitas harus ikut-ikutan pakai sistem digital buat mengelola data mahasiswa."
        },
        {
            "paraId": "P-abc003",
            "content": "Machine learning merupakan cabang dari artificial intelligence yang memungkinkan komputer belajar dari data tanpa diprogram secara eksplisit (Mitchell, 1997)."
        }
    ],
    "references_text": "[1] Mitchell, T.M. (1997). Machine Learning. McGraw-Hill.\n[2] Breiman, L. (2001). Random Forests. Machine Learning, 45(1), 5-32.",
    "active_chapter_id": "chapter_bab2",
    "chapters_summary": [
        {"id": "chapter_bab1", "title": "BAB I Pendahuluan", "summary": "Latar belakang, rumusan masalah, dan tujuan penelitian", "wordCount": 1200},
        {"id": "chapter_bab2", "title": "BAB II Tinjauan Pustaka", "summary": "Landasan teori machine learning dan random forest", "wordCount": 800},
    ]
}


def test_agent_run():
    """Test 1: Basic thesis editing task"""
    print("\n" + "=" * 60)
    print("TEST 1: Perbaiki Gaya Akademis")
    print("=" * 60)

    payload = {
        "task": "Perbaiki gaya penulisan paragraf P-abc002 agar lebih akademis dan formal. Paragraf itu terlalu kasual.",
        "context": SAMPLE_CONTEXT,
        "projectId": "test-project-001",
        "chapterId": "chapter_bab2",
        "model": "llama-70b",
        "mode": "planning",
    }

    events_received = {
        "STEP": 0,
        "TOOL_CALL": 0,
        "TOOL_RESULT": 0,
        "PENDING_DIFF": 0,
        "TEXT_DELTA": 0,
        "DONE": 0,
        "ERROR": 0,
    }
    full_text = ""

    try:
        response = requests.post(BASE_URL, json=payload, stream=True, timeout=60)
        
        if response.status_code != 200:
            print(f"❌ HTTP Error: {response.status_code}")
            print(response.text)
            return False

        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            
            json_str = line[len("data:"):].strip()
            if json_str == "[DONE]":
                continue

            try:
                event = json.loads(json_str)
                event_type = event.get("type", "UNKNOWN")
                events_received[event_type] = events_received.get(event_type, 0) + 1

                if event_type == "STEP":
                    print(f"  📋 STEP: {event.get('step')} — {event.get('message', '')}")
                elif event_type == "TOOL_CALL":
                    print(f"  🔧 TOOL_CALL: {event.get('tool')}({json.dumps(event.get('args', {}), ensure_ascii=False)[:80]}...)")
                elif event_type == "TOOL_RESULT":
                    result = event.get("result", {})
                    has_diff = "diff" in result if isinstance(result, dict) else False
                    print(f"  ✅ TOOL_RESULT: {event.get('tool')} (has_diff={has_diff})")
                elif event_type == "PENDING_DIFF":
                    diff = event.get("diff", {})
                    print(f"  📝 PENDING_DIFF: {diff.get('type')} on {diff.get('paraId')}")
                    print(f"     Reason: {diff.get('reason', 'N/A')}")
                elif event_type == "TEXT_DELTA":
                    delta = event.get("delta", "")
                    full_text += delta
                elif event_type == "DONE":
                    print(f"  🏁 DONE")
                elif event_type == "ERROR":
                    print(f"  ❌ ERROR: {event.get('message')}")
                
            except json.JSONDecodeError:
                pass

        # Print collected text
        if full_text:
            print(f"\n  📖 Agent Response ({len(full_text)} chars):")
            print(f"  {full_text[:500]}{'...' if len(full_text) > 500 else ''}")

        # Validation
        print(f"\n  📊 Event Summary:")
        for etype, count in events_received.items():
            if count > 0:
                print(f"     {etype}: {count}")

        # Checks
        success = True
        if events_received["DONE"] == 0 and events_received["ERROR"] == 0:
            print("  ❌ FAIL: No DONE or ERROR event received")
            success = False
        if events_received["TEXT_DELTA"] == 0 and events_received["TOOL_CALL"] == 0:
            print("  ❌ FAIL: No TEXT_DELTA or TOOL_CALL events — agent produced no output")
            success = False
        if events_received["STEP"] < 2:
            print("  ⚠️  WARNING: Expected at least 2 STEP events (planning + executing)")

        if success:
            print("  ✅ TEST PASSED")
        return success

    except requests.exceptions.ConnectionError:
        print("❌ Connection refused. Is the server running on localhost:5000?")
        print("   Start with: python run.py")
        return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


def test_conversational():
    """Test 2: Simple conversational query (should respond without tools)"""
    print("\n" + "=" * 60)
    print("TEST 2: Conversational Query (No Tools)")
    print("=" * 60)

    payload = {
        "task": "Halo, bisa bantu saya menulis tesis?",
        "context": {"context_title": "Test Thesis"},
        "projectId": "test-project-001",
        "model": "llama-70b",
    }

    events = {"TEXT_DELTA": 0, "TOOL_CALL": 0, "DONE": 0}

    try:
        response = requests.post(BASE_URL, json=payload, stream=True, timeout=60)
        if response.status_code != 200:
            print(f"❌ HTTP Error: {response.status_code}")
            return False

        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            json_str = line[len("data:"):].strip()
            try:
                event = json.loads(json_str)
                etype = event.get("type", "")
                events[etype] = events.get(etype, 0) + 1
            except:
                pass

        print(f"  TEXT_DELTA events: {events['TEXT_DELTA']}")
        print(f"  TOOL_CALL events: {events['TOOL_CALL']}")
        
        if events["TEXT_DELTA"] > 0:
            print("  ✅ TEST PASSED — Agent responded with text")
            return True
        else:
            print("  ⚠️  No text response received")
            return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


if __name__ == "__main__":
    print("🚀 OnThesis Agent SSE Endpoint Tests")
    print(f"   Target: {BASE_URL}")
    print(f"   Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    results = []
    results.append(("Thesis Editing", test_agent_run()))

    print("\nWaiting 3s to avoid rate limits...")
    time.sleep(3)

    results.append(("Conversational", test_conversational()))

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} — {name}")

    all_passed = all(r[1] for r in results)
    sys.exit(0 if all_passed else 1)
