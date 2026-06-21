const AssemblyPlayerUI = {
  controlsContainer: null,
  stepInfoContainer: null,
  startBtn: null,
  stopBtn: null,
  prevBtn: null,
  nextBtn: null,
  playPauseBtn: null,
  progressBar: null,
  progressText: null,
  speedSelect: null,
  modeSelect: null,
  startLayerSelect: null,
  targetLayerSelect: null,
  clearFilterBtn: null,
  unsubscribe: null,

  init(controlsId, stepInfoId, callbacks) {
    this.controlsContainer = document.querySelector(controlsId);
    this.stepInfoContainer = document.querySelector(stepInfoId);
    this.callbacks = callbacks || {};

    this.renderControls();
    this.renderStepInfoEmpty();
    this.bindEvents();

    this.unsubscribe = AssemblyPlayerState.subscribe(state => this.updateUI(state));
  },

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  renderControls() {
    if (!this.controlsContainer) return;

    this.controlsContainer.innerHTML = `
      <div class="player-controls">
        <button id="playerStartBtn" class="secondary player-btn" title="开始演示">▶ 装配演示</button>
        <button id="playerStopBtn" class="secondary player-btn" style="display:none" title="退出演示">■ 退出</button>
        <div class="player-controls-group" id="playerControlsGroup" style="display:none">
          <button id="playerPrevBtn" class="secondary player-btn" title="上一步">◀</button>
          <button id="playerPlayPauseBtn" class="player-btn" title="播放/暂停">▶</button>
          <button id="playerNextBtn" class="secondary player-btn" title="下一步">▶</button>
        </div>
        <div class="player-progress" id="playerProgress" style="display:none">
          <div class="player-progress-bar">
            <div class="player-progress-fill" id="playerProgressFill"></div>
          </div>
          <span class="player-progress-text" id="playerProgressText">0 / 0</span>
        </div>
        <div class="player-speed" id="playerSpeed" style="display:none">
          <label>速度</label>
          <select id="playerSpeedSelect">
            <option value="3000">慢 (3s)</option>
            <option value="2000">较慢 (2s)</option>
            <option value="1500" selected>正常 (1.5s)</option>
            <option value="1000">较快 (1s)</option>
            <option value="500">快 (0.5s)</option>
          </select>
        </div>
        <div class="player-mode" id="playerMode" style="display:none">
          <label>模式</label>
          <select id="playerModeSelect">
            <option value="auto" selected>自动播放</option>
            <option value="manual">手动步进</option>
          </select>
        </div>
        <div class="player-layer-filter" id="playerLayerFilter" style="display:none">
          <label>起始层</label>
          <select id="playerStartLayerSelect">
            <option value="">全部</option>
          </select>
          <label>截止层</label>
          <select id="playerTargetLayerSelect">
            <option value="">全部</option>
          </select>
          <button id="playerClearFilterBtn" class="secondary player-btn" title="清除筛选" style="min-width:auto;padding:0 8px;height:30px;font-size:12px;">清除</button>
        </div>
      </div>
    `;

    this.startBtn = this.controlsContainer.querySelector("#playerStartBtn");
    this.stopBtn = this.controlsContainer.querySelector("#playerStopBtn");
    this.prevBtn = this.controlsContainer.querySelector("#playerPrevBtn");
    this.nextBtn = this.controlsContainer.querySelector("#playerNextBtn");
    this.playPauseBtn = this.controlsContainer.querySelector("#playerPlayPauseBtn");
    this.progressFill = this.controlsContainer.querySelector("#playerProgressFill");
    this.progressText = this.controlsContainer.querySelector("#playerProgressText");
    this.speedSelect = this.controlsContainer.querySelector("#playerSpeedSelect");
    this.modeSelect = this.controlsContainer.querySelector("#playerModeSelect");
    this.startLayerSelect = this.controlsContainer.querySelector("#playerStartLayerSelect");
    this.targetLayerSelect = this.controlsContainer.querySelector("#playerTargetLayerSelect");
    this.clearFilterBtn = this.controlsContainer.querySelector("#playerClearFilterBtn");
    this.controlsGroup = this.controlsContainer.querySelector("#playerControlsGroup");
    this.progressContainer = this.controlsContainer.querySelector("#playerProgress");
    this.speedContainer = this.controlsContainer.querySelector("#playerSpeed");
    this.modeContainer = this.controlsContainer.querySelector("#playerMode");
    this.layerFilterContainer = this.controlsContainer.querySelector("#playerLayerFilter");
  },

  renderStepInfoEmpty() {
    if (!this.stepInfoContainer) return;
    this.stepInfoContainer.innerHTML = `
      <div class="step-info-empty">
        <div class="step-info-icon">📦</div>
        <div class="step-info-title">装配演示</div>
        <div class="step-info-desc">点击"装配演示"按钮，查看斗拱构件的装配过程。</div>
        <div class="step-info-desc" style="margin-top:8px;font-size:12px;color:#9a8c7e;">支持分层播放和手动步进模式，可选择只播放指定层级。</div>
      </div>
    `;
  },

  renderStepInfo(stepInfo, state) {
    if (!this.stepInfoContainer) return;

    if (!stepInfo) {
      this.renderStepInfoEmpty();
      return;
    }

    const hintsHtml = stepInfo.hints.map(h =>
      `<div class="step-hint-item">💡 ${h}</div>`
    ).join("");

    const layerFilterInfo = state && (state.startLayer || state.targetLayer)
      ? `<div class="step-info-row step-filter-info">
          <span class="step-info-label">层级范围：</span>
          <span class="step-info-value">第 ${state.startLayer || 1} 层 至 第 ${state.targetLayer || Math.max(...state.layers, 1)} 层</span>
        </div>`
      : "";

    const modeInfo = state
      ? `<div class="step-info-row">
          <span class="step-info-label">播放模式：</span>
          <span class="step-info-value">${state.playbackMode === "manual" ? "手动步进" : "自动播放"}</span>
        </div>`
      : "";

    this.stepInfoContainer.innerHTML = `
      <div class="step-info">
        <div class="step-info-header">
          <span class="step-badge">第 ${stepInfo.stepIndex + 1} 步</span>
          <span class="step-layer-badge">第 ${stepInfo.layer} 层</span>
        </div>
        <div class="step-part-name">${stepInfo.partType}</div>
        <div class="step-part-desc">${stepInfo.typeDescription || ""}</div>
        <div class="step-layer-desc">${stepInfo.layerDescription || ""}</div>
        ${layerFilterInfo}
        ${modeInfo}
        <div class="step-info-row">
          <span class="step-info-label">方向：</span>
          <span class="step-info-value">${stepInfo.direction}</span>
        </div>
        <div class="step-info-row">
          <span class="step-info-label">连接点：</span>
          <span class="step-info-value">${stepInfo.connectPoint}</span>
        </div>
        <div class="step-info-section">
          <div class="step-info-section-title">装配提示</div>
          <div class="step-hints">
            ${hintsHtml}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    if (this.startBtn) {
      this.startBtn.onclick = () => {
        if (this.callbacks.onStart) this.callbacks.onStart();
      };
    }

    if (this.stopBtn) {
      this.stopBtn.onclick = () => {
        if (this.callbacks.onStop) this.callbacks.onStop();
      };
    }

    if (this.prevBtn) {
      this.prevBtn.onclick = () => AssemblyPlayerState.prevStep();
    }

    if (this.nextBtn) {
      this.nextBtn.onclick = () => AssemblyPlayerState.nextStep();
    }

    if (this.playPauseBtn) {
      this.playPauseBtn.onclick = () => AssemblyPlayerState.togglePlay();
    }

    if (this.speedSelect) {
      this.speedSelect.onchange = (e) => {
        AssemblyPlayerState.setSpeed(Number(e.target.value));
      };
    }

    if (this.modeSelect) {
      this.modeSelect.onchange = (e) => {
        AssemblyPlayerState.setPlaybackMode(e.target.value);
      };
    }

    if (this.startLayerSelect) {
      this.startLayerSelect.onchange = (e) => {
        const val = e.target.value;
        if (val === "") {
          AssemblyPlayerState.setStartLayer(null);
        } else {
          AssemblyPlayerState.setStartLayer(Number(val));
        }
      };
    }

    if (this.targetLayerSelect) {
      this.targetLayerSelect.onchange = (e) => {
        const val = e.target.value;
        if (val === "") {
          AssemblyPlayerState.setTargetLayer(null);
        } else {
          AssemblyPlayerState.setTargetLayer(Number(val));
        }
      };
    }

    if (this.clearFilterBtn) {
      this.clearFilterBtn.onclick = () => {
        AssemblyPlayerState.clearLayerFilter();
      };
    }
  },

  _updateLayerSelects(layers, startLayer, targetLayer) {
    if (!this.startLayerSelect || !this.targetLayerSelect) return;

    const buildOptions = (selectedVal) => {
      let html = '<option value="">全部</option>';
      layers.forEach(layer => {
        const selected = String(selectedVal) === String(layer) ? " selected" : "";
        html += `<option value="${layer}"${selected}>第 ${layer} 层</option>`;
      });
      return html;
    };

    this.startLayerSelect.innerHTML = buildOptions(startLayer);
    this.targetLayerSelect.innerHTML = buildOptions(targetLayer);
  },

  updateUI(state) {
    this.updateControlsVisibility(state);
    this.updateButtonStates(state);
    this.updateProgress(state);
    this._updateLayerSelects(state.layers, state.startLayer, state.targetLayer);
    this.updateStepInfoWithState(state);

    if (this.modeSelect) {
      this.modeSelect.value = state.playbackMode;
    }
  },

  updateControlsVisibility(state) {
    if (state.isActive) {
      if (this.startBtn) this.startBtn.style.display = "none";
      if (this.stopBtn) this.stopBtn.style.display = "inline-block";
      if (this.controlsGroup) this.controlsGroup.style.display = "inline-flex";
      if (this.progressContainer) this.progressContainer.style.display = "flex";
      if (this.speedContainer) this.speedContainer.style.display = state.playbackMode === "auto" ? "flex" : "none";
      if (this.modeContainer) this.modeContainer.style.display = "flex";
      if (this.layerFilterContainer) this.layerFilterContainer.style.display = "flex";
    } else {
      if (this.startBtn) this.startBtn.style.display = "inline-block";
      if (this.stopBtn) this.stopBtn.style.display = "none";
      if (this.controlsGroup) this.controlsGroup.style.display = "none";
      if (this.progressContainer) this.progressContainer.style.display = "none";
      if (this.speedContainer) this.speedContainer.style.display = "none";
      if (this.modeContainer) this.modeContainer.style.display = "none";
      if (this.layerFilterContainer) this.layerFilterContainer.style.display = "none";
    }
  },

  updateButtonStates(state) {
    if (this.prevBtn) {
      this.prevBtn.disabled = !state.canGoPrev;
      this.prevBtn.style.opacity = state.canGoPrev ? "1" : "0.5";
    }

    if (this.nextBtn) {
      this.nextBtn.disabled = !state.canGoNext;
      this.nextBtn.style.opacity = state.canGoNext ? "1" : "0.5";
    }

    if (this.playPauseBtn) {
      if (state.playbackMode === "manual") {
        this.playPauseBtn.textContent = "▶▶";
        this.playPauseBtn.title = "下一步";
      } else if (state.isPlaying) {
        this.playPauseBtn.textContent = "⏸";
        this.playPauseBtn.title = "暂停";
      } else {
        this.playPauseBtn.textContent = "▶";
        this.playPauseBtn.title = "播放";
      }
    }
  },

  updateProgress(state) {
    const current = state.currentStep + 1;
    const total = state.totalSteps;
    const percent = total > 0 ? (current / total) * 100 : 0;

    if (this.progressFill) {
      this.progressFill.style.width = percent + "%";
    }

    if (this.progressText) {
      this.progressText.textContent = Math.max(0, current) + " / " + total;
    }
  },

  updateStepInfoWithState(state) {
    if (state.isActive) {
      this.renderStepInfo(state.currentStepInfo, state);
    } else {
      this.renderStepInfoEmpty();
    }
  },

  updateStepInfo(state) {
    this.updateStepInfoWithState(state);
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyPlayerUI };
