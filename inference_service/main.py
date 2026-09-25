from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI(
    title="MedAI Studio — ONNX Inference Service Demo",
    description="Prototype ONNX deployment endpoint. Research prototype — not for clinical use.",
    version="0.1.0"
)

class PredictRequest(BaseModel):
    model_id: str = "unet_cardiac_v1"
    image_shape: List[int] = [1, 1, 160, 160]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ONNX Inference Container",
        "disclaimer": "Prototype deployment — not a clinical deployment."
    }

@app.get("/model-card")
def get_model_card():
    return {
        "model_name": "Efficient-UNet Cardiac Segmenter",
        "format": "ONNX",
        "opset": 17,
        "input_shape": [1, 1, 160, 160],
        "output_classes": 4,
        "disclaimer": "Prototype deployment — not a clinical deployment."
    }

@app.post("/predict")
def predict(req: PredictRequest):
    return {
        "status": "success",
        "model_id": req.model_id,
        "predicted_mask_shape": req.image_shape,
        "inference_latency_ms": 42.5,
        "disclaimer": "Research classification / model prediction output — not a diagnosis."
    }
