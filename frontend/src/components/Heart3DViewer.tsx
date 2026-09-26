import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type HeartStructure = 'LV' | 'RV' | 'MYO' | 'LA' | 'RA' | null;

interface StructureMetrics {
  LV?: { EDV_mL: number; ESV_mL: number; SV_mL: number; EF_percent: number };
  RV?: { EDV_mL: number; ESV_mL: number; SV_mL: number; EF_percent: number };
  Myocardium?: { Mass_g: number; MaxThickness_mm: number };
}

interface Props {
  metrics?: StructureMetrics;
  onSelect: (s: HeartStructure) => void;
  selected: HeartStructure;
}

const STRUCTURE_COLORS: Record<string, { base: number; emissive: number; hl: number; hlEmissive: number }> = {
  LV:  { base: 0xb91c1c, emissive: 0x5a0000, hl: 0xef4444, hlEmissive: 0xaa0000 },
  RV:  { base: 0x1e3a8a, emissive: 0x0a1540, hl: 0x3b82f6, hlEmissive: 0x1e3a8a },
  MYO: { base: 0x7c2d12, emissive: 0x3a0c00, hl: 0xf97316, hlEmissive: 0x7c3404 },
  LA:  { base: 0x991b1b, emissive: 0x450000, hl: 0xf87171, hlEmissive: 0x991b1b },
  RA:  { base: 0x1e40af, emissive: 0x0c1f5c, hl: 0x60a5fa, hlEmissive: 0x1e40af },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function makeTube(
  pts: [number, number, number][],
  radius: number,
  color: number,
  roughness = 0.38,
  opacity = 1.0,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 28, radius, 10, false);
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.05,
    clearcoat: 0.3,
    clearcoatRoughness: 0.5,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Mesh(geo, mat);
}

function makeEllipsoid(
  sx: number, sy: number, sz: number,
  color: number,
  emissive: number,
  opacity = 1.0,
  roughness = 0.38,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 64, 48);
  geo.applyMatrix4(new THREE.Matrix4().makeScale(sx, sy, sz));
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: 0.18,
    roughness,
    metalness: 0.04,
    clearcoat: 0.4,
    clearcoatRoughness: 0.5,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Mesh(geo, mat);
}

function makeLabel(text: string, color: string, size = 38): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 300, 80);
  ctx.font = `bold ${size}px "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.fillText(text, 150, 55);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.48, 1);
  return sprite;
}

function makeSmallLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 360; canvas.height = 60;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 360, 60);
  ctx.font = `500 26px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(text, 180, 42);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.27, 1);
  return sprite;
}

// ── Component ────────────────────────────────────────────────────────────────
export const Heart3DViewer: React.FC<Props> = ({ metrics, onSelect, selected }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesRef = useRef<Record<string, THREE.Mesh>>({});
  const frameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const [hovered, setHovered] = useState<HeartStructure>(null);

  const applyMaterial = useCallback((name: string, isSel: boolean, isHov: boolean) => {
    const mesh = meshesRef.current[name];
    if (!mesh) return;
    const c = STRUCTURE_COLORS[name];
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    const active = isSel || isHov;
    mat.color.setHex(active ? c.hl : c.base);
    mat.emissive.setHex(active ? c.hlEmissive : c.emissive);
    mat.emissiveIntensity = active ? 0.65 : 0.18;
    if (name === 'MYO') mat.opacity = active ? 0.82 : 0.50;
    mat.needsUpdate = true;
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.FogExp2(0x050810, 0.055);

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0.2, 0.4, 9.5);

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a1a2e, 2.2));

    const key = new THREE.DirectionalLight(0xffd4d4, 4.0);
    key.position.set(4, 6, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x4466ff, 1.2);
    fill.position.set(-5, -3, -4);
    scene.add(fill);

    const rim = new THREE.PointLight(0xff6666, 3.5, 16);
    rim.position.set(-3, 4, -5);
    scene.add(rim);

    const top = new THREE.PointLight(0xffdddd, 2.5, 12);
    top.position.set(0, 6, 3);
    scene.add(top);

    const bottom = new THREE.PointLight(0x223366, 1.5, 10);
    bottom.position.set(0, -6, 2);
    scene.add(bottom);

    // ── Outer heart shell (pericardial sac look) ───────────────────────────
    // Build classic heart bezier silhouette, extrude into 3D
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0.5, 0.5);
    heartShape.bezierCurveTo(0.5, 0.5,  0.40,  0.00,  0.00, 0.00);
    heartShape.bezierCurveTo(-0.60, 0.00, -0.60, 0.70, -0.60, 0.70);
    heartShape.bezierCurveTo(-0.60, 1.12, -0.35, 1.56,  0.50, 1.92);
    heartShape.bezierCurveTo( 1.35, 1.56,  1.60, 1.12,  1.60, 0.70);
    heartShape.bezierCurveTo( 1.60, 0.70,  1.60, 0.00,  1.00, 0.00);
    heartShape.bezierCurveTo( 0.70, 0.00,  0.50, 0.50,  0.50, 0.50);

    const extrude: THREE.ExtrudeGeometryOptions = {
      steps: 3, depth: 1.10,
      bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.20,
      bevelOffset: 0, bevelSegments: 20,
    };
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrude);
    heartGeo.center();
    const S = 1.52;
    heartGeo.applyMatrix4(new THREE.Matrix4().makeScale(S, S, S));
    heartGeo.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1)); // tip down

    // Semi-transparent outer shell (epicardium)
    const epicMat = new THREE.MeshPhysicalMaterial({
      color: 0xcc2222,
      emissive: 0x550000,
      emissiveIntensity: 0.15,
      roughness: 0.40,
      metalness: 0.04,
      transparent: true,
      opacity: 0.16,
      side: THREE.FrontSide,
      depthWrite: false,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
    });
    const epicMesh = new THREE.Mesh(heartGeo, epicMat);
    epicMesh.name = 'OUTER';
    epicMesh.renderOrder = 12;
    scene.add(epicMesh);

    // Back-face of heart shell
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x881111,
      roughness: 0.7,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const innerMesh = new THREE.Mesh(heartGeo, innerMat);
    innerMesh.name = 'INNER';
    innerMesh.renderOrder = 11;
    scene.add(innerMesh);

    // ── Epicardial fat (yellow adipose tissue in sulci) ────────────────────
    const fatMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4b483, emissive: 0x5c3d00, emissiveIntensity: 0.1,
      roughness: 0.85, metalness: 0.0, transparent: true, opacity: 0.70,
    });
    // Atrioventricular groove fat
    const fatGeo1 = new THREE.TorusGeometry(1.0, 0.12, 10, 40, Math.PI * 1.1);
    const fatMesh1 = new THREE.Mesh(fatGeo1, fatMat);
    fatMesh1.position.set(0.0, 0.38, 0.0);
    fatMesh1.rotation.x = Math.PI / 2;
    fatMesh1.rotation.z = -0.3;
    scene.add(fatMesh1);

    // ── LV — Left Ventricle ────────────────────────────────────────────────
    // Largest chamber, lower-left, elongated downward toward apex
    const lvMesh = makeEllipsoid(0.74, 1.06, 0.60, STRUCTURE_COLORS.LV.base, STRUCTURE_COLORS.LV.emissive, 0.95);
    lvMesh.name = 'LV';
    lvMesh.position.set(-0.42, -0.28, 0.05);
    lvMesh.castShadow = true;
    lvMesh.renderOrder = 3;
    scene.add(lvMesh);
    meshesRef.current['LV'] = lvMesh;

    // ── MYO — Myocardial wall (outer shell surrounding LV) ────────────────
    const myoMesh = makeEllipsoid(1.00, 1.28, 0.78, STRUCTURE_COLORS.MYO.base, STRUCTURE_COLORS.MYO.emissive, 0.50, 0.60);
    myoMesh.name = 'MYO';
    myoMesh.position.set(-0.40, -0.25, 0.02);
    myoMesh.renderOrder = 6;
    (myoMesh.material as THREE.MeshPhysicalMaterial).depthWrite = false;
    scene.add(myoMesh);
    meshesRef.current['MYO'] = myoMesh;

    // ── RV — Right Ventricle ────────────────────────────────────────────────
    // Smaller, crescent-shaped, anterior to LV, deoxygenated (dark blue)
    const rvMesh = makeEllipsoid(0.60, 0.94, 0.52, STRUCTURE_COLORS.RV.base, STRUCTURE_COLORS.RV.emissive, 0.93);
    rvMesh.name = 'RV';
    rvMesh.position.set(0.68, -0.14, 0.18);
    rvMesh.castShadow = true;
    rvMesh.renderOrder = 3;
    scene.add(rvMesh);
    meshesRef.current['RV'] = rvMesh;

    // ── Interventricular Septum (wall between LV and RV) ──────────────────
    const septGeo = new THREE.CylinderGeometry(0.80, 0.72, 0.08, 32);
    const septMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d, roughness: 0.6, metalness: 0.0,
    });
    const septMesh = new THREE.Mesh(septGeo, septMat);
    septMesh.position.set(0.12, -0.22, 0.10);
    septMesh.rotation.z = Math.PI / 2;
    septMesh.rotation.x = 0.3;
    scene.add(septMesh);

    // ── LA — Left Atrium (upper-left, posterior, receives pulm veins) ─────
    const laMesh = makeEllipsoid(0.48, 0.44, 0.45, STRUCTURE_COLORS.LA.base, STRUCTURE_COLORS.LA.emissive, 0.92);
    laMesh.name = 'LA';
    laMesh.position.set(-0.58, 0.80, -0.28);
    laMesh.castShadow = true;
    laMesh.renderOrder = 3;
    scene.add(laMesh);
    meshesRef.current['LA'] = laMesh;

    // ── RA — Right Atrium (upper-right, receives SVC/IVC) ─────────────────
    const raMesh = makeEllipsoid(0.50, 0.46, 0.44, STRUCTURE_COLORS.RA.base, STRUCTURE_COLORS.RA.emissive, 0.92);
    raMesh.name = 'RA';
    raMesh.position.set(0.80, 0.75, -0.08);
    raMesh.castShadow = true;
    raMesh.renderOrder = 3;
    scene.add(raMesh);
    meshesRef.current['RA'] = raMesh;

    // ── Interatrial Septum ─────────────────────────────────────────────────
    const iaSeptGeo = new THREE.CylinderGeometry(0.38, 0.36, 0.06, 28);
    const iaSeptMesh = new THREE.Mesh(iaSeptGeo, septMat.clone());
    iaSeptMesh.position.set(0.1, 0.78, -0.2);
    iaSeptMesh.rotation.z = Math.PI / 2;
    iaSeptMesh.rotation.x = 0.2;
    scene.add(iaSeptMesh);

    // ── GREAT VESSELS ─────────────────────────────────────────────────────

    // Ascending Aorta + Arch (bright red, oxygenated, exits LV)
    const aortaRoot: [number, number, number] = [-0.30, 0.70, 0.12];
    const aortaAscend: [number, number, number] = [-0.18, 1.30, 0.08];
    const aortaArch1: [number, number, number] = [-0.05, 1.72, 0.0];
    const aortaArch2: [number, number, number] = [0.40, 1.85, -0.12];
    const aortaArch3: [number, number, number] = [0.80, 1.70, -0.22];
    const aortaDescend: [number, number, number] = [1.0, 1.20, -0.28];
    const aortaMesh = makeTube([aortaRoot, aortaAscend, aortaArch1, aortaArch2, aortaArch3, aortaDescend], 0.155, 0xcc1111, 0.35);
    aortaMesh.name = 'AORTA';
    aortaMesh.castShadow = true;
    scene.add(aortaMesh);

    // Brachiocephalic trunk branch off aortic arch
    const brach = makeTube([[0.2, 1.82, -0.05], [0.3, 2.15, 0.0], [0.4, 2.4, 0.05]], 0.07, 0xcc1111, 0.38);
    scene.add(brach);
    const lcc = makeTube([[-0.05, 1.82, 0.0], [-0.05, 2.10, 0.05], [-0.10, 2.4, 0.08]], 0.055, 0xcc1111, 0.38);
    scene.add(lcc);

    // Pulmonary Trunk (dark blue deoxygenated, exits RV, bifurcates)
    const ptRoot: [number, number, number] = [0.52, 0.72, 0.22];
    const ptMid: [number, number, number] = [0.38, 1.28, 0.18];
    const ptTop: [number, number, number] = [0.18, 1.58, 0.10];
    const ptMesh = makeTube([ptRoot, ptMid, ptTop], 0.130, 0x1a237e, 0.38);
    ptMesh.name = 'PA';
    scene.add(ptMesh);

    // Right pulmonary artery
    const rpa = makeTube([[0.18, 1.55, 0.08], [0.70, 1.58, 0.0], [1.10, 1.48, -0.08]], 0.080, 0x1a237e, 0.40);
    scene.add(rpa);
    // Left pulmonary artery
    const lpa = makeTube([[0.18, 1.55, 0.08], [-0.22, 1.58, 0.0], [-0.60, 1.44, -0.06]], 0.080, 0x1a237e, 0.40);
    scene.add(lpa);

    // Superior Vena Cava (SVC) — dark blue, enters RA from above
    const svc = makeTube([[1.00, 2.30, -0.05], [0.90, 1.72, -0.05], [0.80, 1.22, -0.04]], 0.100, 0x1a237e, 0.40);
    svc.name = 'SVC';
    scene.add(svc);

    // Inferior Vena Cava (IVC) — dark blue, enters RA from below
    const ivc = makeTube([[0.92, -1.60, 0.0], [0.88, -0.90, -0.02], [0.82, 0.32, -0.05]], 0.095, 0x1a237e, 0.40);
    scene.add(ivc);

    // Pulmonary veins (4) — bright red, enter LA from both sides
    const pvColor = 0xcc1111;
    const pv1 = makeTube([[-1.10, 1.10, -0.35], [-0.85, 0.95, -0.28], [-0.62, 0.85, -0.25]], 0.065, pvColor, 0.38);
    scene.add(pv1);
    const pv2 = makeTube([[-1.05, 0.68, -0.38], [-0.82, 0.74, -0.30], [-0.62, 0.78, -0.26]], 0.065, pvColor, 0.38);
    scene.add(pv2);
    const pv3 = makeTube([[0.10, 1.15, -0.42], [-0.10, 1.00, -0.32], [-0.30, 0.90, -0.26]], 0.065, pvColor, 0.38);
    scene.add(pv3);
    const pv4 = makeTube([[0.12, 0.72, -0.44], [-0.05, 0.78, -0.34], [-0.25, 0.80, -0.28]], 0.065, pvColor, 0.38);
    scene.add(pv4);

    // ── CORONARY ARTERIES ─────────────────────────────────────────────────
    const caColor = 0xe07020; // warm orange-yellow like in anatomy refs

    // Left Anterior Descending (LAD) — front of heart, down interventricular groove
    const lad = makeTube([
      [-0.10, 0.68, 0.58],
      [-0.15, 0.28, 0.75],
      [-0.20, -0.15, 0.78],
      [-0.25, -0.55, 0.72],
      [-0.30, -0.90, 0.62],
      [-0.35, -1.20, 0.45],
    ], 0.030, caColor, 0.42);
    scene.add(lad);

    // Circumflex (Cx) — around left/posterior
    const cx = makeTube([
      [-0.10, 0.68, 0.55],
      [-0.45, 0.60, 0.52],
      [-0.85, 0.38, 0.40],
      [-1.08, 0.08, 0.22],
      [-1.05, -0.30, 0.10],
      [-0.88, -0.55, -0.05],
    ], 0.026, caColor, 0.42);
    scene.add(cx);

    // Right Coronary Artery (RCA) — around right margin to posterior
    const rca = makeTube([
      [0.55, 0.60, 0.55],
      [0.85, 0.38, 0.50],
      [1.05, 0.10, 0.38],
      [1.08, -0.20, 0.22],
      [1.00, -0.55, 0.05],
      [0.85, -0.80, -0.12],
      [0.55, -0.95, -0.18],
    ], 0.028, caColor, 0.42);
    scene.add(rca);

    // ── Mitral + Tricuspid Valve Annuli (fibrous rings) ──────────────────
    const valveMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, emissive: 0x6b2e00, emissiveIntensity: 0.2, roughness: 0.55 });
    const mitralGeo = new THREE.TorusGeometry(0.28, 0.045, 10, 32);
    const mitral = new THREE.Mesh(mitralGeo, valveMat);
    mitral.position.set(-0.30, 0.58, 0.12);
    mitral.rotation.x = Math.PI / 2;
    mitral.rotation.z = 0.22;
    scene.add(mitral);

    const tricuspGeo = new THREE.TorusGeometry(0.26, 0.040, 10, 32);
    const tricusp = new THREE.Mesh(tricuspGeo, valveMat.clone());
    tricusp.position.set(0.60, 0.55, 0.18);
    tricusp.rotation.x = Math.PI / 2;
    tricusp.rotation.z = -0.18;
    scene.add(tricusp);

    // Aortic valve ring
    const aorticValveGeo = new THREE.TorusGeometry(0.14, 0.035, 10, 32);
    const aorticValve = new THREE.Mesh(aorticValveGeo, valveMat.clone());
    aorticValve.position.set(-0.25, 0.65, 0.14);
    aorticValve.rotation.x = Math.PI / 2;
    scene.add(aorticValve);

    // Pulmonary valve ring
    const pulValveGeo = new THREE.TorusGeometry(0.12, 0.030, 10, 32);
    const pulValve = new THREE.Mesh(pulValveGeo, valveMat.clone());
    pulValve.position.set(0.50, 0.68, 0.20);
    pulValve.rotation.x = Math.PI / 2;
    scene.add(pulValve);

    // ── Anatomical Labels ─────────────────────────────────────────────────
    const addLabel = (text: string, color: string, pos: [number, number, number], size?: number) => {
      const sprite = size ? makeSmallLabel(text, color) : makeLabel(text, color);
      sprite.position.set(...pos);
      scene.add(sprite);
    };

    addLabel('LV', '#f87171', [-1.40, -0.20, 0.8]);
    addLabel('RV', '#93c5fd', [1.55, -0.12, 0.8]);
    addLabel('MYO', '#fcd34d', [-0.38, -1.50, 0.6]);
    addLabel('LA', '#fca5a5', [-1.62, 0.88, 0.4]);
    addLabel('RA', '#93c5fd', [1.65, 0.85, 0.4]);
    addLabel('Aorta', '#f87171', [-0.30, 2.10, 0.4], 1);
    addLabel('Pulm. Trunk', '#93c5fd', [0.60, 1.90, 0.4], 1);
    addLabel('SVC', '#93c5fd', [1.30, 2.12, 0.0], 1);
    addLabel('LAD', '#fdba74', [-0.52, -0.62, 1.0], 1);
    addLabel('RCA', '#fdba74', [1.38, -0.55, 0.55], 1);

    // ── OrbitControls ─────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 4.5;
    controls.maxDistance = 16;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.target.set(0.0, 0.0, 0.0);

    // ── Raycaster ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clickable = [lvMesh, myoMesh, rvMesh, laMesh, raMesh];

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickable);
      const hit = hits.length > 0 ? (hits[0].object.name as HeartStructure) : null;
      setHovered(hit);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    };

    const onClick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickable);
      if (hits.length > 0) {
        const name = hits[0].object.name as HeartStructure;
        onSelect(name);
        controls.autoRotate = false;
      } else {
        onSelect(null);
        controls.autoRotate = true;
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // ── Resize ────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    // ── Animate ───────────────────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = clockRef.current.getElapsedTime();
      // Heartbeat: systolic contraction ~1.1 Hz, subtle
      const beat = 1 + Math.abs(Math.sin(t * 1.12)) * 0.020;
      epicMesh.scale.setScalar(beat);
      innerMesh.scale.setScalar(beat);
      lvMesh.scale.setScalar(1 + Math.abs(Math.sin(t * 1.12))       * 0.032);
      myoMesh.scale.setScalar(1 + Math.abs(Math.sin(t * 1.12 - 0.08)) * 0.018);
      rvMesh.scale.setScalar(1 + Math.abs(Math.sin(t * 1.12 + 0.12)) * 0.026);
      laMesh.scale.setScalar(1 + Math.abs(Math.sin(t * 1.12 + 0.25)) * 0.014);
      raMesh.scale.setScalar(1 + Math.abs(Math.sin(t * 1.12 + 0.20)) * 0.014);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      ro.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [onSelect]);

  // Update materials when selection/hover changes
  useEffect(() => {
    (['LV', 'MYO', 'RV', 'LA', 'RA'] as const).forEach(name => {
      applyMaterial(name, selected === name, hovered === name);
    });
  }, [selected, hovered, applyMaterial]);

  const HOVER_LABELS: Record<string, string> = {
    LV: 'Left Ventricle', RV: 'Right Ventricle',
    MYO: 'Myocardium', LA: 'Left Atrium', RA: 'Right Atrium',
  };
  const HOVER_COLORS: Record<string, string> = {
    LV: '#f87171', RV: '#93c5fd', MYO: '#fcd34d', LA: '#fca5a5', RA: '#93c5fd',
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 left-3 space-y-1 pointer-events-none">
        {[
          { key: 'LV', label: 'Left Ventricle',  color: '#f87171' },
          { key: 'RV', label: 'Right Ventricle', color: '#93c5fd' },
          { key: 'LA', label: 'Left Atrium',     color: '#fca5a5' },
          { key: 'RA', label: 'Right Atrium',    color: '#bfdbfe' },
          { key: 'MYO', label: 'Myocardium',     color: '#fcd34d' },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            <span className="text-[9px] text-slate-300 font-medium">{label}</span>
          </div>
        ))}
        <div className="mt-1 border-t border-white/10 pt-1">
          {[
            { color: '#f97316', label: 'Coronary aa.' },
            { color: '#cc2222', label: 'Aorta / Pulm. v.' },
            { color: '#1e40af', label: 'SVC / IVC / Pulm. trunk' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ background: color }} />
              <span className="text-[9px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute top-3 right-3 text-[10px] px-2.5 py-1.5 rounded-lg bg-black/80 border border-white/10 backdrop-blur-sm pointer-events-none"
          style={{ color: HOVER_COLORS[hovered] }}
        >
          ● {HOVER_LABELS[hovered]} — click to inspect
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 text-[9px] text-slate-500 pointer-events-none space-y-0.5">
        <div>🖱 Drag to rotate · Scroll to zoom</div>
        <div>Click LV · RV · LA · RA · MYO to inspect</div>
      </div>
    </div>
  );
};
