const Model3DBuilder = (function() {
  const LAYER_HEIGHT = 30;
  const SCALE_2D_TO_3D = 0.6;
  const CENTER_X = 520;
  const CENTER_Y = 520;

  const MATERIALS = {
    "栌斗": new THREE.MeshStandardMaterial({ color: 0x8f4b31, roughness: 0.85, metalness: 0.05 }),
    "华拱": new THREE.MeshStandardMaterial({ color: 0xa96838, roughness: 0.85, metalness: 0.05 }),
    "昂":   new THREE.MeshStandardMaterial({ color: 0x7d5b32, roughness: 0.85, metalness: 0.05 }),
    "耍头": new THREE.MeshStandardMaterial({ color: 0x9b6c42, roughness: 0.85, metalness: 0.05 }),
    "散斗": new THREE.MeshStandardMaterial({ color: 0x6d4d37, roughness: 0.85, metalness: 0.05 })
  };

  const HIGHLIGHT_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0xffd84d, roughness: 0.4, metalness: 0.3, emissive: 0x664400, emissiveIntensity: 0.3
  });

  function createLuDou() {
    const group = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(74, 18, 74);
    const midGeo = new THREE.BoxGeometry(60, 14, 60);
    const topGeo = new THREE.BoxGeometry(46, 12, 46);

    const base = new THREE.Mesh(baseGeo, MATERIALS["栌斗"]);
    base.position.y = 9;
    group.add(base);

    const mid = new THREE.Mesh(midGeo, MATERIALS["栌斗"]);
    mid.position.y = 25;
    group.add(mid);

    const top = new THREE.Mesh(topGeo, MATERIALS["栌斗"]);
    top.position.y = 38;
    group.add(top);

    return group;
  }

  function createHuaGong(dir) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(124, 26, 28);
    const body = new THREE.Mesh(bodyGeo, MATERIALS["华拱"]);
    body.position.y = 13;
    group.add(body);

    const capGeo = new THREE.BoxGeometry(40, 10, 34);
    const cap = new THREE.Mesh(capGeo, MATERIALS["华拱"]);
    cap.position.y = 31;
    group.add(cap);

    const tipR = 14;
    const tipGeo1 = new THREE.CylinderGeometry(tipR, tipR, 26, 16, 1, false, 0, Math.PI);
    const tip1 = new THREE.Mesh(tipGeo1, MATERIALS["华拱"]);
    tip1.rotation.z = Math.PI / 2;
    tip1.position.set(62, 13, 0);
    group.add(tip1);

    const tipGeo2 = new THREE.CylinderGeometry(tipR, tipR, 26, 16, 1, false, 0, Math.PI);
    const tip2 = new THREE.Mesh(tipGeo2, MATERIALS["华拱"]);
    tip2.rotation.z = -Math.PI / 2;
    tip2.position.set(-62, 13, 0);
    group.add(tip2);

    if (dir === "左挑") group.rotation.y = Math.PI / 2;
    else if (dir === "右挑") group.rotation.y = -Math.PI / 2;

    return group;
  }

  function createAng(dir) {
    const group = new THREE.Group();
    const len = 140;
    const h = 22;
    const w = 26;

    const shape = new THREE.Shape();
    shape.moveTo(-len / 2, 0);
    shape.lineTo(len / 2, -12);
    shape.lineTo(len / 2, h - 12);
    shape.lineTo(-len / 2, h);
    shape.lineTo(-len / 2, 0);

    const extrudeSettings = { depth: w, bevelEnabled: false };
    const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const body = new THREE.Mesh(bodyGeo, MATERIALS["昂"]);
    body.position.z = -w / 2;
    body.position.y = 4;
    group.add(body);

    const tipShape = new THREE.Shape();
    tipShape.moveTo(0, 0);
    tipShape.lineTo(18, -6);
    tipShape.lineTo(18, 10);
    tipShape.lineTo(0, 16);
    tipShape.lineTo(0, 0);
    const tipGeo = new THREE.ExtrudeGeometry(tipShape, { depth: w + 2, bevelEnabled: false });
    const tip = new THREE.Mesh(tipGeo, MATERIALS["昂"]);
    tip.position.set(len / 2 - 2, -12, -(w + 2) / 2);
    group.add(tip);

    if (dir === "左挑") group.rotation.y = Math.PI / 2;
    else if (dir === "右挑") group.rotation.y = -Math.PI / 2;

    return group;
  }

  function createShuaTou(dir) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(90, 24, 28);
    const body = new THREE.Mesh(bodyGeo, MATERIALS["耍头"]);
    body.position.set(-15, 12, 0);
    group.add(body);

    const headShape = new THREE.Shape();
    headShape.moveTo(0, 0);
    headShape.lineTo(28, -4);
    headShape.lineTo(40, 8);
    headShape.lineTo(28, 20);
    headShape.lineTo(0, 24);
    headShape.lineTo(0, 0);
    const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 30, bevelEnabled: false });
    const head = new THREE.Mesh(headGeo, MATERIALS["耍头"]);
    head.position.set(30, -4, -15);
    group.add(head);

    if (dir === "左挑") group.rotation.y = Math.PI / 2;
    else if (dir === "右挑") group.rotation.y = -Math.PI / 2;

    return group;
  }

  function createSanDou() {
    const group = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(48, 14, 48);
    const midGeo = new THREE.BoxGeometry(38, 10, 38);
    const topGeo = new THREE.BoxGeometry(28, 8, 28);

    const base = new THREE.Mesh(baseGeo, MATERIALS["散斗"]);
    base.position.y = 7;
    group.add(base);

    const mid = new THREE.Mesh(midGeo, MATERIALS["散斗"]);
    mid.position.y = 19;
    group.add(mid);

    const top = new THREE.Mesh(topGeo, MATERIALS["散斗"]);
    top.position.y = 28;
    group.add(top);

    return group;
  }

  function createMeshForType(type, dir) {
    switch (type) {
      case "栌斗": return createLuDou();
      case "华拱": return createHuaGong(dir);
      case "昂":   return createAng(dir);
      case "耍头": return createShuaTou(dir);
      case "散斗": return createSanDou();
      default:     return createSanDou();
    }
  }

  function buildPart3D(part) {
    const group = createMeshForType(part.type, part.dir);

    const x3d = (part.x - CENTER_X) * SCALE_2D_TO_3D;
    const z3d = (part.y - CENTER_Y) * SCALE_2D_TO_3D;
    const y3d = (part.layer - 1) * LAYER_HEIGHT;

    group.position.set(x3d, y3d, z3d);
    group.userData = {
      partId: part.id,
      partType: part.type,
      layer: part.layer,
      baseY: y3d,
      originalMaterials: []
    };

    group.traverse(function(child) {
      if (child.isMesh) {
        child.userData.originalMaterial = child.material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  function buildAll(scheme) {
    const partsGroup = new THREE.Group();
    partsGroup.name = "dougongParts";

    scheme.forEach(function(part) {
      const mesh = buildPart3D(part);
      partsGroup.add(mesh);
    });

    return partsGroup;
  }

  function applyHighlight(group, isHighlighted) {
    if (!group) return;
    group.traverse(function(child) {
      if (child.isMesh) {
        if (isHighlighted) {
          child.material = HIGHLIGHT_MATERIAL;
        } else {
          if (child.userData && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
          } else if (MATERIALS[group.userData.partType]) {
            child.material = MATERIALS[group.userData.partType];
          }
        }
      }
    });
  }

  function applyExplosion(partsGroup, explodeAmount) {
    if (!partsGroup) return;
    partsGroup.children.forEach(function(partGroup) {
      if (partGroup.userData && partGroup.userData.baseY !== undefined) {
        partGroup.position.y = partGroup.userData.baseY +
          (partGroup.userData.layer - 1) * explodeAmount;
      }
    });
  }

  return {
    buildPart3D: buildPart3D,
    buildAll: buildAll,
    applyHighlight: applyHighlight,
    applyExplosion: applyExplosion,
    LAYER_HEIGHT: LAYER_HEIGHT,
    SCALE_2D_TO_3D: SCALE_2D_TO_3D
  };
})();

if (typeof module !== "undefined") module.exports = { Model3DBuilder };
