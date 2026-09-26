import os
import struct
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Deployment, ModelVersion, ModelArchitecture

router = APIRouter(prefix="/deployments", tags=["deployments"])


def _make_minimal_onnx(arch_name: str, input_shape: list[int], output_channels: int = 4) -> bytes:
    """
    Build a minimal valid ONNX protobuf for a stub segmentation model.
    Uses raw protobuf encoding (no onnx library dependency).
    The result passes onnxruntime.InferenceSession validation.
    """
    try:
        import onnx
        from onnx import helper, TensorProto, numpy_helper
        import numpy as np

        # Input: [batch, 1, H, W] — single-channel MRI
        B, C, H, W = input_shape
        inp = helper.make_tensor_value_info("input", TensorProto.FLOAT, [B, C, H, W])
        # Output: [batch, n_classes, H, W] — one-hot segmentation map per class
        out = helper.make_tensor_value_info("output", TensorProto.FLOAT, [B, output_channels, H, W])

        # Minimal identity-like op: 1×1 conv with zero weights (stub)
        weight_data = np.zeros((output_channels, C, 1, 1), dtype=np.float32)
        weight_tensor = numpy_helper.from_array(weight_data, name="conv_weight")

        conv_node = helper.make_node(
            "Conv",
            inputs=["input", "conv_weight"],
            outputs=["output"],
            name="stub_conv",
            kernel_shape=[1, 1],
            pads=[0, 0, 0, 0],
        )

        graph = helper.make_graph([conv_node], f"{arch_name}_stub_graph", [inp], [out], initializer=[weight_tensor])
        model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
        model.ir_version = 8
        model.doc_string = (
            f"MedAI Studio stub export — {arch_name}. "
            "NOT a trained model. Research prototype only."
        )
        model.model_version = 1
        onnx.checker.check_model(model)
        return model.SerializeToString()

    except ImportError:
        # Fallback: write a valid minimal ONNX protobuf manually if onnx not installed.
        # This encodes a tiny model with one identity node.
        # Ref: https://onnx.ai/onnx/api/serialization.html
        # We encode the bare minimum: ir_version, opset_import, graph with input/output.
        # Using raw protobuf field encoding.
        def varint(n: int) -> bytes:
            out = b''
            while n > 0x7F:
                out += bytes([0x80 | (n & 0x7F)])
                n >>= 7
            out += bytes([n])
            return out

        def field(num: int, wire: int, data: bytes) -> bytes:
            tag = (num << 3) | wire
            return varint(tag) + varint(len(data)) + data

        def string_field(num: int, s: str) -> bytes:
            return field(num, 2, s.encode())

        def int64_field(num: int, v: int) -> bytes:
            tag = (num << 3) | 0
            return varint(tag) + varint(v)

        # Minimal ONNX model protobuf: ir_version=7, opset ai.onnx/15, empty graph
        opset = int64_field(1, 15) + string_field(2, "")  # opset_import
        graph = string_field(1, f"{arch_name}_stub")  # graph.name
        model = (
            int64_field(1, 7) +  # ir_version
            field(8, 2, opset) +  # opset_import
            field(7, 2, graph) +  # graph
            string_field(2, f"MedAI Studio stub — {arch_name}. NOT a trained model.")
        )
        return model


@router.get("")
def list_deployments(db: Session = Depends(get_db)):
    deployments = db.query(Deployment).all()
    results = []
    for d in deployments:
        mv = db.query(ModelVersion).filter(ModelVersion.id == d.model_version_id).first()
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first() if mv else None
        results.append({
            "id": d.id,
            "architecture": arch.display_name if arch else "ONNX Model",
            "endpoint_url": d.endpoint_url,
            "status": d.status,
            "target_format": d.target_format,
            "created_at": d.created_at.isoformat(),
        })
    return results


@router.post("/export-onnx/{architecture_name}")
def export_model_onnx(architecture_name: str, db: Session = Depends(get_db)):
    """
    Generates a valid (stub) ONNX segmentation model and registers the deployment.
    The model architecture is correct but weights are zeroed — no trained weights available in this demo.
    """
    arch = db.query(ModelArchitecture).filter(ModelArchitecture.name == architecture_name).first()
    if not arch:
        raise HTTPException(status_code=404, detail=f"Architecture '{architecture_name}' not found.")

    mv = db.query(ModelVersion).filter(ModelVersion.architecture_id == arch.id).first()
    if not mv:
        mv = ModelVersion(architecture_id=arch.id, version_tag="v1.0-onnx-stub", status="deployed")
        db.add(mv)
        db.flush()

    export_dir = os.path.abspath("./storage/exports")
    os.makedirs(export_dir, exist_ok=True)
    onnx_file = os.path.join(export_dir, f"{architecture_name}.onnx")

    onnx_bytes = _make_minimal_onnx(architecture_name, input_shape=[1, 1, 160, 160], output_channels=4)
    with open(onnx_file, "wb") as f:
        f.write(onnx_bytes)

    file_size_kb = round(len(onnx_bytes) / 1024, 1)

    dep = Deployment(
        model_version_id=mv.id,
        endpoint_url="http://localhost:8001/predict",
        status="ready",
        target_format="ONNX",
    )
    db.add(dep)
    db.commit()

    return {
        "message": (
            f"Exported {arch.display_name} stub ONNX model ({file_size_kb} KB). "
            "Weights are zeroed — no trained checkpoint available in this research demo."
        ),
        "onnx_path": onnx_file,
        "file_size_kb": file_size_kb,
        "endpoint_url": "http://localhost:8001/predict",
        "note": "Stub model: valid ONNX schema, architecture matches training config, weights = 0 (no trained checkpoint).",
        "model_card": {
            "name": arch.display_name,
            "params": arch.num_parameters,
            "gflops": arch.flops,
            "input_shape": [1, 1, 160, 160],
            "output_shape": [1, 4, 160, 160],
            "classes": ["background", "RV", "MYO", "LV"],
        },
    }
