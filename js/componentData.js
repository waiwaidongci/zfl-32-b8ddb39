const ComponentData = {
  "栌斗": {
    name: "栌斗",
    alias: "大斗、坐斗",
    purpose: "斗拱最下层的承重构件，是整个斗拱组合的基座。主要作用是将上方多层拱、昂传递下来的荷载均匀分布到下方的柱头或阑额上，同时起到找平、定位的作用，是斗拱与柱梁结构之间的关键过渡构件。",
    position: "位于斗拱组的最底部，直接坐落在柱头或普拍枋上。在单朵斗拱中仅有一个栌斗，是整个斗拱的承重基础。",
    assemblyNotes: [
      "栌斗必须置于柱头中心线上，偏移量不宜超过10mm",
      "底面需与柱头或普拍枋顶面严密贴合，不得悬空",
      "斗耳、斗平、斗欹三部分比例需符合《营造法式》规定",
      "安装前需检查斗底卯口与柱头榫头的配合间隙",
      "承重方向应与木纹方向一致，避免横纹受剪"
    ],
    diagram: `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ldouGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#9a5a3e"/>
          <stop offset="100%" style="stop-color:#6d4428"/>
        </linearGradient>
      </defs>
      <rect x="20" y="70" width="120" height="40" rx="4" fill="url(#ldouGrad)" stroke="#4a2e1a" stroke-width="2"/>
      <rect x="40" y="50" width="80" height="25" fill="#8f4b31" stroke="#4a2e1a" stroke-width="2"/>
      <rect x="55" y="35" width="50" height="18" fill="#7a3f28" stroke="#4a2e1a" stroke-width="2"/>
      <line x1="40" y1="50" x2="55" y2="35" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="120" y1="50" x2="105" y2="35" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="20" y1="70" x2="40" y2="50" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="140" y1="70" x2="120" y2="50" stroke="#4a2e1a" stroke-width="1.5"/>
      <text x="80" y="110" text-anchor="middle" font-size="11" fill="#4a2e1a" font-weight="bold">斗耳</text>
      <text x="80" y="62" text-anchor="middle" font-size="10" fill="#4a2e1a">斗平</text>
      <text x="80" y="88" text-anchor="middle" font-size="10" fill="#4a2e1a">斗欹</text>
    </svg>`
  },
  "华拱": {
    name: "华拱",
    alias: "卷头、杪拱",
    purpose: "斗拱中的横向出跳构件，主要作用是承托上方的拱、枋和屋檐，将荷载传递至下层的斗或栌斗。华拱是斗拱出跳的主要构件，通过层层出挑来增加屋檐的伸出长度，同时起到装饰作用。",
    position: "位于栌斗上方，沿建筑进深方向（正面方向）出挑。可分为单杪、双杪甚至三杪，每一层华拱上方通常置散斗承托上一层构件。",
    assemblyNotes: [
      "华拱出跳尺寸需严格按照设计，每跳一般为30份（材份制）",
      "拱头卷杀需符合法式规定，瓣数准确、曲线圆润",
      "拱身需保持水平，倾斜度不得超过0.5度",
      "与斗的卯口配合要紧密，间隙不宜超过2mm",
      "华拱的方向（正、左挑、右挑）需与设计一致"
    ],
    diagram: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="huaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#b87a48"/>
          <stop offset="100%" style="stop-color:#8a5428"/>
        </linearGradient>
      </defs>
      <rect x="10" y="23" width="180" height="34" rx="17" fill="url(#huaGrad)" stroke="#4a2e1a" stroke-width="2"/>
      <rect x="80" y="18" width="40" height="44" fill="#9a6238" stroke="#4a2e1a" stroke-width="1.5"/>
      <path d="M10,40 Q25,23 38,23" fill="none" stroke="#6d4428" stroke-width="1.5" stroke-dasharray="4,2"/>
      <path d="M190,40 Q175,57 162,57" fill="none" stroke="#6d4428" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="100" y="45" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">华拱</text>
      <text x="30" y="15" text-anchor="middle" font-size="10" fill="#4a2e1a">拱头卷杀</text>
      <text x="170" y="70" text-anchor="middle" font-size="10" fill="#4a2e1a">拱尾</text>
      <text x="100" y="75" text-anchor="middle" font-size="9" fill="#6d4428">出跳方向 →</text>
    </svg>`
  },
  "昂": {
    name: "昂",
    alias: "角昂、平出昂",
    purpose: "斗拱中的斜向悬挑构件，利用杠杆原理承挑屋檐。昂的作用是将屋檐的荷载通过昂身向后传递至梁架，同时前端向下压以平衡屋檐重量，是斗拱中兼具结构功能和装饰效果的重要构件。",
    position: "位于华拱之上或之间，从斗拱组向前方斜出。昂头朝下、昂尾朝上，前端承托撩檐枋，后尾压在梁架之下。可分为下昂、上昂两种，其中下昂最为常见。",
    assemblyNotes: [
      "昂的倾斜角度需准确，一般为15-20度，直接影响出挑效果",
      "昂头（昂嘴）造型需符合法式，曲线自然流畅",
      "昂身需保持直线，不得有弯曲变形",
      "昂底与斗的接触面需严密贴合，保证传力均匀",
      "昂尾需与梁架或枋木可靠连接，防止滑脱",
      "注意区分正方向与左、右挑方向的安装角度"
    ],
    diagram: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="angGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8d6a3e"/>
          <stop offset="100%" style="stop-color:#5e4422"/>
        </linearGradient>
      </defs>
      <rect x="30" y="30" width="140" height="28" rx="3" fill="url(#angGrad)" stroke="#4a2e1a" stroke-width="2" transform="skewX(-18)"/>
      <rect x="30" y="30" width="35" height="28" fill="#7a5a32" stroke="#4a2e1a" stroke-width="1.5"/>
      <polygon points="168,38 185,48 168,58" fill="#5e4422" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="25" y1="55" x2="180" y2="55" stroke="#8d6a3e" stroke-width="1" stroke-dasharray="3,3"/>
      <path d="M185,48 L195,48" stroke="#4a2e1a" stroke-width="1.5" marker-end="url(#arrow)"/>
      <text x="100" y="30" text-anchor="middle" font-size="11" fill="#4a2e1a" font-weight="bold">昂身</text>
      <text x="175" y="75" text-anchor="middle" font-size="10" fill="#4a2e1a">昂嘴</text>
      <text x="45" y="20" text-anchor="middle" font-size="10" fill="#4a2e1a">昂尾</text>
      <text x="100" y="85" text-anchor="middle" font-size="9" fill="#6d4428">倾斜角度约16°</text>
    </svg>`
  },
  "耍头": {
    name: "耍头",
    alias: "爵头、胡孙头",
    purpose: "斗拱最上层的悬挑构件，位于昂或华拱之上。主要作用是承托撩檐枋，前端常作各种装饰性处理（如蚂蚱头、麻叶头等），兼具结构承重和装饰美化功能，是斗拱组的收尾构件。",
    position: "位于斗拱组的最上层，在令拱之上，与华拱、昂同方向出挑。前端伸出斗拱之外，后尾可延伸至梁架或与其他构件连接。",
    assemblyNotes: [
      "耍头出挑长度需与下层华拱、昂协调，保证整体造型",
      "前端装饰造型（如蚂蚱头）需雕刻工整、比例协调",
      "底面与令拱、散斗的接触面需平整严密",
      "顶面需水平，保证撩檐枋安装平直",
      "耍头木纹应与受力方向一致，增加承重能力"
    ],
    diagram: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shuaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#aa7a4e"/>
          <stop offset="100%" style="stop-color:#7d542e"/>
        </linearGradient>
      </defs>
      <rect x="20" y="24" width="120" height="32" rx="4" fill="url(#shuaGrad)" stroke="#4a2e1a" stroke-width="2"/>
      <rect x="20" y="24" width="30" height="32" fill="#8b5a32" stroke="#4a2e1a" stroke-width="1.5"/>
      <path d="M140,24 L170,18 L175,40 L170,62 L140,56 Z" fill="#9b6c42" stroke="#4a2e1a" stroke-width="2"/>
      <circle cx="160" cy="40" r="3" fill="#4a2e1a"/>
      <path d="M165,30 L170,25 M168,33 L173,28" stroke="#4a2e1a" stroke-width="1.5"/>
      <text x="80" y="45" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">耍头</text>
      <text x="155" y="12" text-anchor="middle" font-size="10" fill="#4a2e1a">蚂蚱头造型</text>
      <text x="35" y="72" text-anchor="middle" font-size="10" fill="#4a2e1a">后尾</text>
    </svg>`
  },
  "散斗": {
    name: "散斗",
    alias: "小斗、交互斗、齐心斗",
    purpose: "斗拱中的小型承重构件，用于各层拱、昂之间的连接。散斗的作用是在拱与拱、拱与昂之间传递荷载，同时固定各层构件的相对位置，保证斗拱整体的稳定性。根据位置不同可分为交互斗、齐心斗、散斗等。",
    position: "分布在各层华拱、昂、耍头的端部或中间，承托上一层构件。每一层出跳构件的两端通常各置一个散斗，中间根据需要设置齐心斗。",
    assemblyNotes: [
      "散斗尺寸需与所承托的拱身宽度匹配",
      "斗口需与拱的宽度严密配合，防止拱身晃动",
      "散斗需放置在构件的中心线上，不得偏斜",
      "同一层的散斗顶面需保持同一水平",
      "斗底需与下层构件顶面严密贴合，不得悬空",
      "注意区分交互斗（十字开口）与齐心斗（单向开口）的用法"
    ],
    diagram: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#7d5a3e"/>
          <stop offset="100%" style="stop-color:#523825"/>
        </linearGradient>
      </defs>
      <rect x="20" y="55" width="80" height="35" rx="3" fill="url(#sanGrad)" stroke="#4a2e1a" stroke-width="2"/>
      <rect x="35" y="38" width="50" height="20" fill="#6d4d37" stroke="#4a2e1a" stroke-width="2"/>
      <rect x="45" y="28" width="30" height="12" fill="#5c4028" stroke="#4a2e1a" stroke-width="2"/>
      <line x1="35" y1="38" x2="45" y2="28" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="85" y1="38" x2="75" y2="28" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="20" y1="55" x2="35" y2="38" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="100" y1="55" x2="85" y2="38" stroke="#4a2e1a" stroke-width="1.5"/>
      <line x1="50" y1="28" x2="50" y2="18" stroke="#4a2e1a" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="70" y1="28" x2="70" y2="18" stroke="#4a2e1a" stroke-width="1" stroke-dasharray="3,2"/>
      <text x="60" y="95" text-anchor="middle" font-size="10" fill="#4a2e1a">斗欹</text>
      <text x="60" y="52" text-anchor="middle" font-size="9" fill="#4a2e1a">斗平</text>
      <text x="60" y="12" text-anchor="middle" font-size="9" fill="#4a2e1a">斗口（承拱）</text>
    </svg>`
  }
};

if (typeof module !== "undefined") module.exports = { ComponentData };
