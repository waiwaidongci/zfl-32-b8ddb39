const DOUGONG_TEMPLATES = [
  {
    id: "simple",
    name: "单拱简易铺作",
    scale: "小型",
    partsCount: 4,
    description: "最基础的斗拱结构，由栌斗承托华拱，两端施散斗，适用于小型殿宇。",
    parts: [
      { type: "栌斗", x: 560, y: 560, layer: 1, dir: "正", connect: "柱头" },
      { type: "华拱", x: 535, y: 490, layer: 2, dir: "正", connect: "下承" },
      { type: "散斗", x: 470, y: 468, layer: 3, dir: "正", connect: "华拱左端" },
      { type: "散斗", x: 660, y: 468, layer: 3, dir: "正", connect: "华拱右端" }
    ]
  },
  {
    id: "medium",
    name: "五铺作单抄单下昂",
    scale: "中型",
    partsCount: 8,
    description: "宋《营造法式》标准形制，华拱出跳加下昂，结构均衡，广泛用于殿身。",
    parts: [
      { type: "栌斗", x: 560, y: 600, layer: 1, dir: "正", connect: "柱头" },
      { type: "华拱", x: 535, y: 540, layer: 2, dir: "正", connect: "下承" },
      { type: "散斗", x: 470, y: 518, layer: 3, dir: "正", connect: "华拱左端" },
      { type: "散斗", x: 660, y: 518, layer: 3, dir: "正", connect: "华拱右端" },
      { type: "昂", x: 540, y: 470, layer: 4, dir: "正", connect: "下承华拱" },
      { type: "散斗", x: 490, y: 448, layer: 5, dir: "左挑", connect: "昂前端" },
      { type: "耍头", x: 555, y: 400, layer: 5, dir: "正", connect: "昂后尾" },
      { type: "散斗", x: 680, y: 448, layer: 5, dir: "右挑", connect: "耍头前端" }
    ]
  },
  {
    id: "complex",
    name: "七铺作重抄重下昂",
    scale: "大型",
    partsCount: 13,
    description: "高等级斗拱形制，双抄双昂出四跳，用于宫殿、寺观等重要建筑的柱头。",
    parts: [
      { type: "栌斗", x: 560, y: 640, layer: 1, dir: "正", connect: "柱头" },
      { type: "华拱", x: 535, y: 590, layer: 2, dir: "正", connect: "下承栌斗" },
      { type: "散斗", x: 455, y: 568, layer: 3, dir: "正", connect: "华拱左端" },
      { type: "散斗", x: 665, y: 568, layer: 3, dir: "正", connect: "华拱右端" },
      { type: "华拱", x: 535, y: 520, layer: 4, dir: "正", connect: "下承第一跳" },
      { type: "散斗", x: 425, y: 498, layer: 5, dir: "左挑", connect: "二跳华拱左端" },
      { type: "散斗", x: 695, y: 498, layer: 5, dir: "右挑", connect: "二跳华拱右端" },
      { type: "昂", x: 540, y: 450, layer: 6, dir: "正", connect: "下承二跳" },
      { type: "散斗", x: 405, y: 428, layer: 7, dir: "左挑", connect: "昂一跳前端" },
      { type: "散斗", x: 715, y: 428, layer: 7, dir: "右挑", connect: "昂一跳后尾" },
      { type: "昂", x: 540, y: 380, layer: 8, dir: "正", connect: "下承第一昂" },
      { type: "耍头", x: 555, y: 310, layer: 9, dir: "正", connect: "第二昂后尾" },
      { type: "散斗", x: 380, y: 288, layer: 9, dir: "左挑", connect: "二昂前端" }
    ]
  }
];

if (typeof module !== "undefined") module.exports = { DOUGONG_TEMPLATES };
