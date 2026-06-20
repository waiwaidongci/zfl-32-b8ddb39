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
    this.controlsGroup = this.controlsContainer.querySelector("#playerControlsGroup");
    this.progressContainer = this.controlsContainer.querySelector("#playerProgress");
    this.speedContainer = this.controlsContainer.querySelector("#playerSpeed");
  },

  renderStepInfoEmpty() {
    if (!this.stepInfoContainer) return;
    this.stepInfoContainer.innerHTML = `
      <div class="step-info-empty">
        <div class="step-info-icon">📦</div>
        <div class="step-info-title">装配演示</div>
        <div class="step-info-desc">点击"装配演示"按钮，查看斗拱构件的装配过程。</div>
      </div>
    `;
  },

  renderStepInfo(stepInfo) {
    if (!this.stepInfoContainer) return;

    if (!stepInfo) {
      this.renderStepInfoEmpty();
      return;
    }

    const hintsHtml = stepInfo.hints.map(h =>
      `<div class="step-hint-item">💡 ${h}</div>`
    ).join("");

    this.stepInfoContainer.innerHTML = `
      <div class="step-info">
        <div class="step-info-header">
          <span class="step-badge">第 ${stepInfo.stepIndex + 1} 步</span>
          <span class="step-layer-badge">第 ${stepInfo.layer} 层</span>
        </div>
        <div class="step-part-name">${stepInfo.partType}</div>
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
  },

  updateUI(state) {
    this.updateControlsVisibility(state);
    this.updateButtonStates(state);
    this.updateProgress(state);
    this.updateStepInfo(state);
  },

  updateControlsVisibility(state) {
    if (state.isActive) {
      if (this.startBtn) this.startBtn.style.display = "none";
      if (this.stopBtn) this.stopBtn.style.display = "inline-block";
      if (this.controlsGroup) this.controlsGroup.style.display = "inline-flex";
      if (this.progressContainer) this.progressContainer.style.display = "flex";
      if (this.speedContainer) this.speedContainer.style.display = "flex";
    } else {
      if (this.startBtn) this.startBtn.style.display = "inline-block";
      if (this.stopBtn) this.stopBtn.style.display = "none";
      if (this.controlsGroup) this.controlsGroup.style.display = "none";
      if (this.progressContainer) this.progressContainer.style.display = "none";
      if (this.speedContainer) this.speedContainer.style.display = "none";
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
      if (state.isPlaying) {
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

  updateStepInfo(state) {
    if (state.isActive) {
      this.renderStepInfo(state.currentStepInfo);
    } else {
      this.renderStepInfoEmpty();
    }
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyPlayerUI };
