"""
Benchmark comparing the Python and Rust prosemirror backends.

Measures the cost of loading documents into memory and applying steps,
calling to_content() every 10 steps.:

  * the memory footprint of the in-memory document representation
    (Python object tree vs. Rust-managed memory)
  * the CPU cost of parsing + applying ProseMirror steps and serializing

Run both backends back-to-back in a single test invocation:

    python manage.py test document.tests.test_prosemirror_benchmark

Tune the workload with environment variables:

    PM_BENCH_DOCS=20  PM_BENCH_STEPS=200 python manage.py test document.tests.test_prosemirror_benchmark
"""

import gc
import os
import time

import psutil
from django.test import TestCase

from document import prosemirror as _py_backend
from document import prosemirror_rs as _rs_backend


class ProsemirrorBackendBenchmark(TestCase):
    """Back-to-back benchmark of the Python and Rust prosemirror backends."""

    fixtures = [
        "initial_documenttemplates.json",
        "initial_styles.json",
    ]

    # Configurable via env vars so CI can use small numbers and a developer
    # can crank them up for a more statistically stable reading.
    NUM_DOCS = int(os.environ.get("PM_BENCH_DOCS", "20"))
    NUM_STEPS = int(os.environ.get("PM_BENCH_STEPS", "200"))

    @classmethod
    def setUpTestData(cls):
        # setUpTestData runs after fixtures are loaded, so the template exists.
        from document.models import DocumentTemplate

        cls.initial_content = DocumentTemplate.objects.get(pk=1).content
        cls.steps = cls._make_steps(cls.NUM_STEPS)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _make_steps(n: int) -> list[dict]:
        """Return *n* sequential single-character text-insertion step dicts.

        Position 1 is the interior of the (initially empty) title node —
        the first valid insertion point inside the document.  Each inserted
        character shifts subsequent positions by one, so ``from = 1 + i``
        always points to the end of the already-inserted title text when step
        *i* is applied to the document produced by all previous steps.
        """
        return [
            {
                "stepType": "replace",
                "from": 1 + i,
                "to": 1 + i,
                "slice": {"content": [{"type": "text", "text": "a"}]},
            }
            for i in range(n)
        ]

    def _run(self, backend, label: str) -> dict:
        """Load NUM_DOCS documents and apply all steps to each one.

        to_content is intentionally NOT called so that the
        numbers reflect only the in-memory representation and step-application
        cost for each backend, making the comparison fair.
        """
        process = psutil.Process(os.getpid())
        gc.collect()

        mem_before = process.memory_info().rss
        cpu_before = process.cpu_times()
        t0 = time.perf_counter()

        # ── load ──────────────────────────────────────────────────────
        docs = [
            backend.from_json(self.initial_content)
            for _ in range(self.NUM_DOCS)
        ]

        # ── apply steps (one step per "diff", matching real usage) ────
        # The Python backend returns a *new* node on each apply; the Rust
        # backend mutates in place and returns the same editor.  Either way
        # we must reassign so the Python backend's accumulated state is passed
        # to the next step.

        for doc in docs:
            for index, step in enumerate(self.steps):
                result = backend.apply([step], doc)
                if result is not False:
                    doc = result
                if index % 10 == 0:
                    # Get the current content as a snapshot to save every 10 steps
                    backend.to_content(doc)

        # ── snapshot while documents are still in memory ──────────────
        t1 = time.perf_counter()
        cpu_after = process.cpu_times()
        gc.collect()
        mem_after = process.memory_info().rss

        stats = {
            "label": label,
            "wall_s": t1 - t0,
            "cpu_s": (
                (cpu_after.user - cpu_before.user)
                + (cpu_after.system - cpu_before.system)
            ),
            "mem_delta_mb": (mem_after - mem_before) / 1024 / 1024,
        }

        print(
            f"\n{'─' * 60}\n"
            f"Backend   : {label}\n"
            f"Documents : {self.NUM_DOCS}   Steps/doc : {self.NUM_STEPS}\n"
            f"Wall time : {stats['wall_s']:.3f} s\n"
            f"CPU time  : {stats['cpu_s']:.3f} s\n"
            f"Memory Δ  : {stats['mem_delta_mb']:+.1f} MB\n"
        )
        return stats

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_compare_backends(self):
        """Run both backends and print a side-by-side comparison.

        The test never fails on performance grounds — it is purely
        informational.  A future threshold assertion can be added once
        baseline numbers have been established.
        """
        # ── Rust backend ───────────────────────────────────────────────
        rs = self._run(_rs_backend, "rust")
        # ── Python backend ─────────────────────────────────────────────
        py = self._run(_py_backend, "python")

        # ── comparison summary ─────────────────────────────────────────
        def ratio(rust_val, python_val, lower_is_better=True):
            if python_val == 0:
                return "n/a"
            r = rust_val / python_val
            direction = "faster" if (r < 1) == lower_is_better else "slower"
            return f"{r:.2f}x ({direction})"

        def ratio_size(rust_val, python_val, lower_is_better=True):
            if python_val == 0:
                return "n/a"
            r = rust_val / python_val
            direction = "smaller" if (r < 1) == lower_is_better else "larger"
            return f"{r:.2f}x ({direction})"

        print(
            f"\n{'=' * 60}\n"
            f"COMPARISON  (Rust vs Python)\n"
            f"{'=' * 60}\n"
            f"Wall time  : {ratio(rs['wall_s'],       py['wall_s'])}\n"
            f"CPU time   : {ratio(rs['cpu_s'],        py['cpu_s'])}\n"
            f"Memory Δ   : {ratio_size(rs['mem_delta_mb'], py['mem_delta_mb'])}\n"
            f"{'=' * 60}\n"
        )
