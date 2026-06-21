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

  const DIFF_MATERIALS = {
    added: new THREE.MeshStandardMaterial({
      color: 0x2e7d32, roughness: 0.6, metalness: 0.1, emissive: 0x1b5e20, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.85
    }),
    deleted: new THREE.MeshStandardMaterial({
      color: 0xc62828, roughness: 0.6, metalness: 0.1, emissive: 0x8e0000, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.5, wireframe: true
    }),
    moved: new THREE.MeshStandardMaterial({
      color: 0x1565c0, roughness: 0.6, metalness: 0.1, emissive: 0x0d47a1, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.85
    }),
    layer: new THREE.MeshStandardMaterial({
      color: 0xe65100, roughness: 0.6, metalness: 0.1, emissive: 0xbf360c, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.85
    }),
    dir: new THREE.MeshStandardMaterial({
      color: 0x6a1b9a, roughness: 0.6, metalness: 0.1, emissive: 0x4a148c, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.85
    }),
    connect: new THREE.MeshStandardMaterial({
      color: 0x00838f, roughness: 0.6, metalness: 0.1, emissive: 0x006064, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.85
    }),
    unchanged: new THREE.MeshStandardMaterial({
      color: 0x9e9e9e, roughness: 0.9, metalness: 0, emissive: 0x000000, emissiveIntensity: 0,
      transparent: true, opacity: 0.3
    })
  };

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

  function buildAllWithDiff(scheme, diffResult) {
    const partsGroup = new THREE.Group();
    partsGroup.name = "dougongParts";

    const currentPartIds = new Set();
    scheme.forEach(function(part) {
      currentPartIds.add(part.id);
      const mesh = buildPart3D(part);
      partsGroup.add(mesh);
    });

    if (diffResult) {
      if (diffResult.deleted && diffResult.deleted.length > 0) {
        const deletedGroup = new THREE.Group();
        deletedGroup.name = "diffDeletedGhosts";
        diffResult.deleted.forEach(function(item) {
          if (!item.part) return;
          if (currentPartIds.has(item.partId)) return;
          var ghostPart = Object.assign({}, item.part, {
            _isDiffGhost: true,
            _diffGhostType: "deleted"
          });
          var ghostMesh = buildPart3D(ghostPart);
          ghostMesh.userData.isDiffGhost = true;
          ghostMesh.userData.diffGhostType = "deleted";
          ghostMesh.userData.partId = item.partId + "_ghost_deleted";
          ghostMesh.userData.originalPartId = item.partId;
          applyDiffHighlight(ghostMesh, "deleted");
          deletedGroup.add(ghostMesh);
        });
        partsGroup.add(deletedGroup);
      }

      if (diffResult.moved && diffResult.moved.length > 0) {
        const movedGhostsGroup = new THREE.Group();
        movedGhostsGroup.name = "diffMovedGhosts";
        diffResult.moved.forEach(function(item) {
          if (!item.part || !item.from) return;
          var ghostPart = Object.assign({}, item.part, {
            x: item.from.x,
            y: item.from.y,
            _isDiffGhost: true,
            _diffGhostType: "moved_origin"
          });
          var ghostMesh = buildPart3D(ghostPart);
          ghostMesh.userData.isDiffGhost = true;
          ghostMesh.userData.diffGhostType = "moved_origin";
          ghostMesh.userData.partId = item.partId + "_ghost_moved";
          ghostMesh.userData.originalPartId = item.partId;
          var moveMat = DIFF_MATERIALS.moved.clone();
          moveMat.wireframe = true;
          moveMat.opacity = 0.35;
          ghostMesh.traverse(function(child) {
            if (child.isMesh) {
              child.material = moveMat;
            }
          });
          movedGhostsGroup.add(ghostMesh);

          var origGroup = partsGroup.children.find(function(c) {
            return c.userData && c.userData.partId === item.partId;
          });
          if (origGroup) {
            var from = {
              x: (item.from.x - CENTER_X) * SCALE_2D_TO_3D,
              z: (item.from.y - CENTER_Y) * SCALE_2D_TO_3D,
              y: (item.part.layer - 1) * LAYER_HEIGHT
            };
            var arrow = createMoveArrow(from, origGroup.position);
            if (arrow) {
              arrow.userData.partId = item.partId + "_arrow";
              movedGhostsGroup.add(arrow);
            }
          }
        });
        partsGroup.add(movedGhostsGroup);
      }
    }

    return partsGroup;
  }

  function createMoveArrow(fromPos, toPos) {
    var from = new THREE.Vector3(fromPos.x, fromPos.y + 20, fromPos.z);
    var to = new THREE.Vector3(toPos.x, toPos.y + 20, toPos.z);
    var dir = new THREE.Vector3().subVectors(to, from);
    var distance = dir.length();
    if (distance < 5) return null;
    dir.normalize();

    var arrowGroup = new THREE.Group();

    var arrowHelper = new THREE.ArrowHelper(
      dir,
      from,
      distance,
      0x1565c0,
      Math.min(12, distance * 0.18),
      Math.min(8, distance * 0.12)
    );
    arrowHelper.line.material.transparent = true;
    arrowHelper.line.material.opacity = 0.75;
    arrowGroup.add(arrowHelper);

    return arrowGroup;
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
    partsGroup.traverse(function(obj) {
      if (obj.userData && obj.userData.baseY !== undefined && obj.userData.layer !== undefined) {
        obj.position.y = obj.userData.baseY +
          (obj.userData.layer - 1) * explodeAmount;
      }
    });
  }

  function applyDiffHighlight(group, diffType) {
    if (!group) return;
    var mat = DIFF_MATERIALS[diffType] || DIFF_MATERIALS.unchanged;
    group.traverse(function(child) {
      if (child.isMesh) {
        child.material = mat;
      }
    });
  }

  function applyDiffHighlightByIds(partsGroup, diffMap) {
    if (!partsGroup || !diffMap) return;
    partsGroup.children.forEach(function(partGroup) {
      var pid = partGroup.userData ? partGroup.userData.partId : null;
      if (!pid) return;
      var primaryType = SchemeDiff.getPrimaryDiffType(diffMap, pid);
      if (primaryType) {
        applyDiffHighlight(partGroup, primaryType);
      } else {
        applyDiffHighlight(partGroup, "unchanged");
      }
    });
  }

  function clearDiffHighlight(partsGroup) {
    if (!partsGroup) return;
    partsGroup.children.forEach(function(partGroup) {
      var partType = partGroup.userData ? partGroup.userData.partType : null;
      var mat = MATERIALS[partType] || MATERIALS["散斗"];
      partGroup.traverse(function(child) {
        if (child.isMesh) {
          if (child.userData && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
          } else {
            child.material = mat;
          }
        }
      });
    });
  }

  return {
    buildPart3D: buildPart3D,
    buildAll: buildAll,
    buildAllWithDiff: buildAllWithDiff,
    applyHighlight: applyHighlight,
    applyExplosion: applyExplosion,
    applyDiffHighlight: applyDiffHighlight,
    applyDiffHighlightByIds: applyDiffHighlightByIds,
    clearDiffHighlight: clearDiffHighlight,
    LAYER_HEIGHT: LAYER_HEIGHT,
    SCALE_2D_TO_3D: SCALE_2D_TO_3D
  };
})();

if (typeof module !== "undefined") module.exports = { Model3DBuilder };
