# Workflow: Run Model Benchmarking Pipeline

1. Ensure training runs have completed for candidate models (or load precomputed run bundles).
2. Execute benchmark script across test split:
   `python scripts/run_benchmark.py --dataset-version v1.0`
3. Verify all parameters, FLOPs, model sizes, and latency timings are recorded with hardware metadata in `BenchmarkResult`.
4. Inspect optimization Pareto frontier and MCDM decision ranking output in backend/DB.
