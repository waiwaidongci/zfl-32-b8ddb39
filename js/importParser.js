const ImportParser = {
  REQUIRED_FIELDS: ["type", "x", "y", "layer"],
  OPTIONAL_FIELDS: ["id", "dir", "connect"],
  VALID_DIRS: ["正", "左挑", "右挑"],
  MAX_LAYER: 16,
  MIN_LAYER: 1,

  parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.name.toLowerCase().endsWith(".json")) {
        reject(new Error("请选择 .json 格式的文件"));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.onload = e => {
        try {
          const raw = JSON.parse(e.target.result);
          const parts = this._extractParts(raw);
          if (!Array.isArray(parts) || parts.length === 0) {
            reject(new Error("未在文件中找到有效的构件数据"));
            return;
          }
          const processed = this._processParts(parts);
          resolve({
            fileName: file.name,
            fileSize: file.size,
            originalCount: parts.length,
            processedCount: processed.length,
            idAddedCount: processed.idAddedCount || 0,
            parts: processed.parts
          });
        } catch (err) {
          reject(new Error("JSON 解析失败：" + err.message));
        }
      };
      reader.readAsText(file, "utf-8");
    });
  },

  _extractParts(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.parts)) return raw.parts;
    if (raw && Array.isArray(raw.scheme)) return raw.scheme;
    if (raw && raw.data && Array.isArray(raw.data)) return raw.data;
    if (raw && raw.data && Array.isArray(raw.data.parts)) return raw.data.parts;
    return null;
  },

  _processParts(parts) {
    let idAdded = 0;
    const seenIds = new Set();
    const processed = parts.map((p, idx) => {
      const item = { ...p };
      if (!item.id || typeof item.id !== "string" || item.id.trim() === "" || seenIds.has(item.id)) {
        item.id = crypto.randomUUID();
        idAdded++;
      }
      seenIds.add(item.id);
      if (item.layer !== undefined && item.layer !== null) {
        const num = Number(item.layer);
        item.layer = isNaN(num) ? 1 : Math.round(num);
      }
      if (item.x !== undefined && item.x !== null) {
        const num = Number(item.x);
        item.x = isNaN(num) ? 460 : Math.round(num);
      }
      if (item.y !== undefined && item.y !== null) {
        const num = Number(item.y);
        item.y = isNaN(num) ? 320 : Math.round(num);
      }
      if (item.type !== undefined && item.type !== null) {
        item.type = String(item.type).trim();
      }
      if (item.dir !== undefined && item.dir !== null) {
        item.dir = String(item.dir).trim();
      }
      if (item.connect !== undefined && item.connect !== null) {
        item.connect = String(item.connect);
      }
      item._originalIndex = idx;
      return item;
    });
    return { parts: processed, idAddedCount: idAdded };
  }
};

if (typeof module !== "undefined") module.exports = { ImportParser };
