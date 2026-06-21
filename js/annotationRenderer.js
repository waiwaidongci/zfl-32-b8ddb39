var AnnotationRenderer = {
  SVG_NS: "http://www.w3.org/2000/svg",
  LABEL_OFFSET: 14,

  render(canvas, state) {
    var existing = canvas.querySelector(".annotation-overlay");
    if (existing) existing.remove();

    if (!state) return;

    var svg = document.createElementNS(this.SVG_NS, "svg");
    svg.setAttribute("class", "annotation-overlay");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";

    var annotations = state.annotations || [];
    for (var i = 0; i < annotations.length; i++) {
      this._renderAnnotation(svg, annotations[i], state);
    }

    if (state.snapPoint) {
      this._renderSnapMarker(svg, state.snapPoint);
    }

    if (state.pendingPoint && state.hoverPoint) {
      this._renderPreviewLine(svg, state.pendingPoint, state.hoverPoint, state.scale);
    }

    if (state.pendingPoint) {
      this._renderPendingMarker(svg, state.pendingPoint);
    }

    canvas.appendChild(svg);
  },

  _renderPreviewLine(svg, from, to, scale) {
    var line = document.createElementNS(this.SVG_NS, "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("class", "annotation-preview-line");
    svg.appendChild(line);

    var dot = document.createElementNS(this.SVG_NS, "circle");
    dot.setAttribute("cx", to.x);
    dot.setAttribute("cy", to.y);
    dot.setAttribute("r", "3");
    dot.setAttribute("class", "annotation-preview-dot");
    svg.appendChild(dot);

    var midX = (from.x + to.x) / 2;
    var midY = (from.y + to.y) / 2;
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var pxDist = Math.sqrt(dx * dx + dy * dy);
    var realDist = pxDist / scale.pixelsPerUnit;
    var distText = pxDist.toFixed(1) + "px ≈ " + realDist.toFixed(2) + scale.unitName;

    var labelBg = document.createElementNS(this.SVG_NS, "rect");
    labelBg.setAttribute("class", "annotation-preview-label-bg");
    svg.appendChild(labelBg);

    var label = document.createElementNS(this.SVG_NS, "text");
    label.setAttribute("x", midX);
    label.setAttribute("y", midY - this.LABEL_OFFSET);
    label.setAttribute("class", "annotation-preview-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = distText;
    svg.appendChild(label);

    var bbox = null;
    try { bbox = label.getBBox(); } catch (e) { bbox = null; }
    if (bbox) {
      var pad = 3;
      labelBg.setAttribute("x", midX - bbox.width / 2 - pad);
      labelBg.setAttribute("y", midY - this.LABEL_OFFSET - bbox.height / 2 - pad);
      labelBg.setAttribute("width", bbox.width + pad * 2);
      labelBg.setAttribute("height", bbox.height + pad * 2);
      labelBg.setAttribute("rx", "3");
    }
  },

  _renderAnnotation(svg, ann, state) {
    var g = document.createElementNS(this.SVG_NS, "g");
    g.setAttribute("class", "annotation-group");
    if (state.selectedAnnotationId === ann.id) {
      g.classList.add("selected");
    }
    g.setAttribute("data-annotation-id", ann.id);
    g.style.pointerEvents = "auto";
    g.style.cursor = "pointer";

    var line = document.createElementNS(this.SVG_NS, "line");
    line.setAttribute("x1", ann.from.x);
    line.setAttribute("y1", ann.from.y);
    line.setAttribute("x2", ann.to.x);
    line.setAttribute("y2", ann.to.y);
    line.setAttribute("class", "annotation-line");
    g.appendChild(line);

    var perpDx = -(ann.to.y - ann.from.y);
    var perpDy = ann.to.x - ann.from.x;
    var perpLen = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
    if (perpLen > 0) {
      perpDx /= perpLen;
      perpDy /= perpLen;
    }
    var tickLen = 6;

    var tick1 = document.createElementNS(this.SVG_NS, "line");
    tick1.setAttribute("x1", ann.from.x - perpDx * tickLen);
    tick1.setAttribute("y1", ann.from.y - perpDy * tickLen);
    tick1.setAttribute("x2", ann.from.x + perpDx * tickLen);
    tick1.setAttribute("y2", ann.from.y + perpDy * tickLen);
    tick1.setAttribute("class", "annotation-tick");
    g.appendChild(tick1);

    var tick2 = document.createElementNS(this.SVG_NS, "line");
    tick2.setAttribute("x1", ann.to.x - perpDx * tickLen);
    tick2.setAttribute("y1", ann.to.y - perpDy * tickLen);
    tick2.setAttribute("x2", ann.to.x + perpDx * tickLen);
    tick2.setAttribute("y2", ann.to.y + perpDy * tickLen);
    tick2.setAttribute("class", "annotation-tick");
    g.appendChild(tick2);

    var dot1 = document.createElementNS(this.SVG_NS, "circle");
    dot1.setAttribute("cx", ann.from.x);
    dot1.setAttribute("cy", ann.from.y);
    dot1.setAttribute("r", "3");
    dot1.setAttribute("class", "annotation-dot");
    g.appendChild(dot1);

    var dot2 = document.createElementNS(this.SVG_NS, "circle");
    dot2.setAttribute("cx", ann.to.x);
    dot2.setAttribute("cy", ann.to.y);
    dot2.setAttribute("r", "3");
    dot2.setAttribute("class", "annotation-dot");
    g.appendChild(dot2);

    var midX = (ann.from.x + ann.to.x) / 2;
    var midY = (ann.from.y + ann.to.y) / 2;
    var distText = MeasurementState.formatDistance(ann);

    var labelBg = document.createElementNS(this.SVG_NS, "rect");
    labelBg.setAttribute("class", "annotation-label-bg");
    g.appendChild(labelBg);

    var label = document.createElementNS(this.SVG_NS, "text");
    label.setAttribute("x", midX);
    label.setAttribute("y", midY - this.LABEL_OFFSET);
    label.setAttribute("class", "annotation-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = distText;
    g.appendChild(label);

    svg.appendChild(g);

    var bbox = null;
    try { bbox = label.getBBox(); } catch (e) { bbox = null; }
    if (bbox) {
      var pad = 3;
      labelBg.setAttribute("x", midX - bbox.width / 2 - pad);
      labelBg.setAttribute("y", midY - this.LABEL_OFFSET - bbox.height / 2 - pad);
      labelBg.setAttribute("width", bbox.width + pad * 2);
      labelBg.setAttribute("height", bbox.height + pad * 2);
      labelBg.setAttribute("rx", "3");
    }
  },

  _renderSnapMarker(svg, snapPoint) {
    var crossSize = 6;
    var cross = document.createElementNS(this.SVG_NS, "g");
    cross.setAttribute("class", "annotation-snap-marker");

    var line1 = document.createElementNS(this.SVG_NS, "line");
    line1.setAttribute("x1", snapPoint.x - crossSize);
    line1.setAttribute("y1", snapPoint.y);
    line1.setAttribute("x2", snapPoint.x + crossSize);
    line1.setAttribute("y2", snapPoint.y);
    line1.setAttribute("class", "annotation-snap-cross");
    cross.appendChild(line1);

    var line2 = document.createElementNS(this.SVG_NS, "line");
    line2.setAttribute("x1", snapPoint.x);
    line2.setAttribute("y1", snapPoint.y - crossSize);
    line2.setAttribute("x2", snapPoint.x);
    line2.setAttribute("y2", snapPoint.y + crossSize);
    line2.setAttribute("class", "annotation-snap-cross");
    cross.appendChild(line2);

    var circle = document.createElementNS(this.SVG_NS, "circle");
    circle.setAttribute("cx", snapPoint.x);
    circle.setAttribute("cy", snapPoint.y);
    circle.setAttribute("r", "4");
    circle.setAttribute("class", "annotation-snap-dot");
    cross.appendChild(circle);

    svg.appendChild(cross);

    if (snapPoint.label) {
      var labelText = snapPoint.label;
      if (snapPoint.partType) {
        labelText = snapPoint.partType + " · " + labelText;
      }

      var labelBg = document.createElementNS(this.SVG_NS, "rect");
      labelBg.setAttribute("class", "annotation-snap-label-bg");
      svg.appendChild(labelBg);

      var label = document.createElementNS(this.SVG_NS, "text");
      label.setAttribute("x", snapPoint.x);
      label.setAttribute("y", snapPoint.y - 16);
      label.setAttribute("class", "annotation-snap-label");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.textContent = labelText;
      svg.appendChild(label);

      var bbox = null;
      try { bbox = label.getBBox(); } catch (e) { bbox = null; }
      if (bbox) {
        var pad = 4;
        labelBg.setAttribute("x", snapPoint.x - bbox.width / 2 - pad);
        labelBg.setAttribute("y", snapPoint.y - 16 - bbox.height / 2 - pad);
        labelBg.setAttribute("width", bbox.width + pad * 2);
        labelBg.setAttribute("height", bbox.height + pad * 2);
        labelBg.setAttribute("rx", "4");
      }
    }
  },

  _renderPendingMarker(svg, point) {
    var circle = document.createElementNS(this.SVG_NS, "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", "5");
    circle.setAttribute("class", "annotation-pending-marker");
    svg.appendChild(circle);

    var pulse = document.createElementNS(this.SVG_NS, "circle");
    pulse.setAttribute("cx", point.x);
    pulse.setAttribute("cy", point.y);
    pulse.setAttribute("r", "5");
    pulse.setAttribute("class", "annotation-pending-pulse");
    svg.appendChild(pulse);
  },

  renderMeasurementPanel(panel, state, onDelete, onSelect, onScaleChange) {
    if (!panel) return;

    var readOnly = !!(state && state.readOnly);
    var annotations = state.annotations || [];
    var html = "";

    html += '<div class="measurement-status">';
    html += '<span class="measurement-mode-indicator ' + (state.isActive ? "active" : "") + '">' +
      (state.isActive ? "● 测量模式已开启" : "○ 测量模式已关闭") + '</span>';
    if (state.isActive && state.pendingPoint) {
      var startInfo = '(' + state.pendingPoint.x + ', ' + state.pendingPoint.y + ')';
      if (state.pendingPoint.snapLabel) {
        if (state.pendingPoint.partType) {
          startInfo = state.pendingPoint.partType + ' · ' + state.pendingPoint.snapLabel;
        } else {
          startInfo = state.pendingPoint.snapLabel;
        }
      }
      html += '<div class="measurement-hint">已选起点 ' + startInfo + '，请点击第二个点</div>';
    } else if (state.isActive) {
      html += '<div class="measurement-hint">点击画布或构件设置标注起点（靠近构件关键点会自动吸附）</div>';
    }
    if (state.isActive && state.snapPoint) {
      var snapInfo = state.snapPoint.label || (state.snapPoint.type || "");
      if (state.snapPoint.partType) {
        snapInfo = state.snapPoint.partType + ' · ' + snapInfo;
      }
      html += '<div class="measurement-snap-hint">已吸附：' + snapInfo + '</div>';
    }
    html += '</div>';

    html += '<div class="scale-setting">';
    html += '<label>比例尺设置</label>';
    html += '<div class="scale-row">';
    html += '<span>1</span>';
    html += '<input id="scalePixels" type="number" min="1" step="1" value="' + state.scale.pixelsPerUnit + '"' + (readOnly ? ' disabled' : '') + '>';
    html += '<span>像素 = 1</span>';
    html += '<input id="scaleUnit" type="text" value="' + state.scale.unitName + '"' + (readOnly ? ' disabled' : '') + '>';
    html += '</div>';
    html += '<div class="measurement-hint">调整比例，使标注显示正确的实际尺寸</div>';
    html += '</div>';

    if (annotations.length > 0) {
      html += '<div class="annotation-list-header"><label>标注列表 (' + annotations.length + ')</label></div>';
      html += '<div class="annotation-list">';
      for (var i = 0; i < annotations.length; i++) {
        var ann = annotations[i];
        var isSelected = state.selectedAnnotationId === ann.id;
        var distText = MeasurementState.formatDistance(ann);
        var fromInfo = "";
        var toInfo = "";
        if (ann.from && ann.from.snapLabel) {
          fromInfo = ann.from.partType ? (ann.from.partType + "·") : "";
          fromInfo += ann.from.snapLabel;
        }
        if (ann.to && ann.to.snapLabel) {
          toInfo = ann.to.partType ? (ann.to.partType + "·") : "";
          toInfo += ann.to.snapLabel;
        }
        var snapInfo = "";
        if (fromInfo || toInfo) {
          snapInfo = '<div class="ann-snap-info">' + (fromInfo || "自由点") + ' → ' + (toInfo || "自由点") + '</div>';
        }
        html += '<div class="annotation-item' + (isSelected ? " selected" : "") + '" data-ann-id="' + ann.id + '">';
        html += '<div class="ann-info">';
        html += '<span class="ann-dist">' + distText + '</span>';
        html += snapInfo;
        html += '</div>';
        html += '<button class="ann-delete" data-ann-delete="' + ann.id + '" title="删除此标注"' + (readOnly ? ' disabled' : '') + '>×</button>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<div class="annotation-empty">暂无标注，开启测量模式后点击两点创建标注</div>';
    }

    panel.innerHTML = html;

    var scalePxInput = panel.querySelector("#scalePixels");
    var scaleUnitInput = panel.querySelector("#scaleUnit");
    if (scalePxInput && scaleUnitInput) {
      var handleScaleChange = function () {
        if (readOnly) return;
        var px = Number(scalePxInput.value);
        var unit = scaleUnitInput.value;
        if (onScaleChange) onScaleChange(px, unit);
      };
      scalePxInput.onchange = handleScaleChange;
      scalePxInput.oninput = handleScaleChange;
      scaleUnitInput.onchange = handleScaleChange;
      scaleUnitInput.oninput = handleScaleChange;
    }

    panel.querySelectorAll("[data-ann-id]").forEach(function (el) {
      el.onclick = function (e) {
        if (e.target.hasAttribute("data-ann-delete")) return;
        if (readOnly) return;
        if (onSelect) onSelect(el.dataset.annId);
      };
    });

    panel.querySelectorAll("[data-ann-delete]").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        if (readOnly) return;
        if (onDelete) onDelete(btn.dataset.annDelete);
      };
    });
  }
};

if (typeof module !== "undefined") module.exports = { AnnotationRenderer };
