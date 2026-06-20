const DOUGONG_TEMPLATES = [
  {
    id: "simple",
    name: "单拱简易铺作",
    scale: "小型",
    partsCount: 4,
    description: "最基础的斗拱结构，由栌斗承托华拱，两端施散斗，适用于小型殿宇。",
    parts: [
      { type: "栌斗", x: 523, y: 580, layer: 1, dir: "正", connect: "柱头" },
      { type: "华拱", x: 498, y: 520, layer: 2, dir: "正", connect: "下承栌斗" },
      { type: "散斗", x: 505, y: 482, layer: 3, dir: "正", connect: "华拱左端" },
      { type: "散斗", x: 607, y: 482, layer: 3, dir: "正", connect: "华拱右端" }
    ]
  },
  {
    id: "medium",
    name: "五铺作单抄单下昂",
    scale: "中型",
    partsCount: 8,
    description: "宋《营造法式》标准形制，华拱出跳加下昂，结构均衡，广泛用于殿身。",
    parts: [
      { type: "栌斗", x: 523, y: 620, layer: 1, dir: "正", connect: "柱头" },
      { type: "华拱", x: 498, y: 560, layer: 2, dir: "正", connect: "下承栌斗" },
      { type: "散斗", x: 505, y: 522, layer: 3, dir: "正", connect: "华拱左端" },
      { type: "散斗", x: 607, y: 522, layer: 3, dir: "正", connect: "华拱右端" },
      { type: "昂", x: 504, y: 480, layer: 4, dir: "正", connect: "下承华拱" },
      { type: "散斗", x: 492, y: 445, layer: 5, dir: "左挑", connect: "昂前端" },
      { type: "耍头", x: 544, y: 442, layer: 5, dir: "正", connect: "昂后尾" },
      { type: "散斗", x: 618, y: 445, layer: 5, dir: "右挑", connect: "耍头前端" }
    ]
  },
  {
    id: "complex",
    name: "七铺作重抄重下昂",
    scale: "大型",
    partsCount: 13,
    description: "高等级斗拱形制，双抄双昂出四跳，用于宫殿、寺观等重要建筑的柱头。",
    parts: [
      { type: "栌斗", x: 523, y: 680, layer: 1, dir: "正", connect: "柱头" },
      { type: "华拱", x: 498, y: 620, layer: 2, dir: "正", connect: "下承栌斗" },
      { type: "散斗", x: 505, y: 582, layer: 3, dir: "正", connect: "头跳华拱左端" },
      { type: "散斗", x: 607, y: 582, layer: 3, dir: "正", connect: "头跳华拱右端" },
      { type: "华拱", x: 478, y: 540, layer: 4, dir: "正", connect: "下承第一跳" },
      { type: "散斗", x: 482, y: 502, layer: 5, dir: "左挑", connect: "二跳华拱左端" },
      { type: "散斗", x: 585, y: 502, layer: 5, dir: "右挑", connect: "二跳华拱右端" },
      { type: "昂", x: 475, y: 460, layer: 6, dir: "正", connect: "下承二跳华拱" },
      { type: "散斗", x: 478, y: 422, layer: 7, dir: "左挑", connect: "头昂前端" },
      { type: "散斗", x: 568, y: 422, layer: 7, dir: "右挑", connect: "头昂后尾" },
      { type: "昂", x: 462, y: 385, layer: 8, dir: "正", connect: "下承头昂" },
      { type: "耍头", x: 518, y: 348, layer: 9, dir: "正", connect: "二昂后尾" },
      { type: "散斗", x: 460, y: 347, layer: 9, dir: "左挑", connect: "二昂前端" }
    ]
  }
];

if (typeof module !== "undefined") module.exports = { DOUGONG_TEMPLATES };
