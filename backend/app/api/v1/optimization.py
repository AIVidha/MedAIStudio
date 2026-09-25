import numpy as np
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db
from app.db.models import BenchmarkResult, ModelArchitecture, ModelVersion

router = APIRouter(prefix="/optimization", tags=["optimization"])

def compute_topsis(matrix: np.ndarray, weights: np.ndarray, is_benefit: List[bool]):
    """
    Computes Technique for Order of Preference by Similarity to Ideal Solution (TOPSIS).
    """
    # Normalize decision matrix
    norm_matrix = matrix / np.sqrt((matrix**2).sum(axis=0))
    
    # Weight normalized matrix
    weighted_matrix = norm_matrix * weights
    
    # Ideal best and ideal worst
    ideal_best = np.zeros(matrix.shape[1])
    ideal_worst = np.zeros(matrix.shape[1])
    
    for j in range(matrix.shape[1]):
        if is_benefit[j]:
            ideal_best[j] = np.max(weighted_matrix[:, j])
            ideal_worst[j] = np.min(weighted_matrix[:, j])
        else:
            ideal_best[j] = np.min(weighted_matrix[:, j])
            ideal_worst[j] = np.max(weighted_matrix[:, j])
            
    # Euclidean distances
    dist_best = np.sqrt(((weighted_matrix - ideal_best)**2).sum(axis=1))
    dist_worst = np.sqrt(((weighted_matrix - ideal_worst)**2).sum(axis=1))
    
    # TOPSIS Relative Closeness Score
    scores = dist_worst / (dist_best + dist_worst)
    return scores

@router.post("/mcdm-rank")
def rank_models_topsis(
    weights: Dict[str, float] = Body(
        default={
            "dice": 0.4,
            "latency": 0.3,
            "params": 0.15,
            "flops": 0.15
        }
    ),
    db: Session = Depends(get_db)
):
    """
    Calculates TOPSIS multi-criteria decision-support ranking based on user objectives.
    """
    results = db.query(BenchmarkResult).all()
    if not results:
        return {"rankings": [], "disclaimer": "No benchmarked models available for ranking."}
        
    matrix = []
    models_meta = []
    
    for r in results:
        mv = db.query(ModelVersion).filter(ModelVersion.id == r.model_version_id).first()
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first() if mv else None
        
        matrix.append([
            r.mean_dice,
            r.latency_median_ms,
            r.num_parameters / 1e6, # in millions
            r.flops
        ])
        models_meta.append({
            "id": r.id,
            "architecture": arch.display_name if arch else "Unknown",
            "name": arch.name if arch else "unknown",
            "mean_dice": r.mean_dice,
            "latency_median_ms": r.latency_median_ms,
            "num_parameters_m": round(r.num_parameters / 1e6, 2),
            "flops_gflops": r.flops
        })
        
    matrix_arr = np.array(matrix)
    
    # Weights array (dice, latency, params, flops)
    w_arr = np.array([
        weights.get("dice", 0.4),
        weights.get("latency", 0.3),
        weights.get("params", 0.15),
        weights.get("flops", 0.15)
    ])
    w_arr = w_arr / np.sum(w_arr) # Normalize weights sum to 1.0
    
    # Benefit flags: Dice is benefit (True), latency/params/flops are cost (False)
    is_benefit = [True, False, False, False]
    
    topsis_scores = compute_topsis(matrix_arr, w_arr, is_benefit)
    
    for i, meta in enumerate(models_meta):
        meta["topsis_score"] = round(float(topsis_scores[i]), 4)
        
    # Rank models descending by TOPSIS score
    ranked = sorted(models_meta, key=lambda x: x["topsis_score"], reverse=True)
    for rank_idx, item in enumerate(ranked):
        item["rank"] = rank_idx + 1
        
    return {
        "ranking_objective": "Decision-support ranking tailored to user weight parameters",
        "weights_applied": weights,
        "rankings": ranked
    }

@router.get("/pareto")
def get_pareto_models(db: Session = Depends(get_db)):
    """
    Computes 2D / 3D Pareto Front non-dominated solutions (Dice vs Latency vs Model Size).
    """
    results = db.query(BenchmarkResult).all()
    if not results:
        return {"pareto_frontier": [], "all_models": []}
        
    models_data = []
    for r in results:
        mv = db.query(ModelVersion).filter(ModelVersion.id == r.model_version_id).first()
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first() if mv else None
        models_data.append({
            "id": r.id,
            "name": arch.display_name if arch else "Unknown",
            "mean_dice": r.mean_dice,
            "latency_median_ms": r.latency_median_ms,
            "flops_gflops": r.flops,
            "model_size_mb": r.model_size_mb
        })
        
    # Find Pareto frontier (maximize Dice, minimize Latency)
    pareto_frontier = []
    for i, m1 in enumerate(models_data):
        is_dominated = False
        for j, m2 in enumerate(models_data):
            if i != j:
                if m2["mean_dice"] >= m1["mean_dice"] and m2["latency_median_ms"] <= m1["latency_median_ms"]:
                    if m2["mean_dice"] > m1["mean_dice"] or m2["latency_median_ms"] < m1["latency_median_ms"]:
                        is_dominated = True
                        break
        m1["is_pareto_optimal"] = not is_dominated
        if not is_dominated:
            pareto_frontier.append(m1)
            
    return {
        "all_models": models_data,
        "pareto_frontier": pareto_frontier
    }

