const AssemblyPlayerState = {
  isPlaying: false,
  currentStep: -1,
  totalSteps: 0,
  playInterval: null,
  playSpeed: 1500,
  steps: [],
  allSteps: [],
  stepCalculatorResult: null,
  isActive: false,
  listeners: [],
  playbackMode: "auto",
  startLayer: null,
  targetLayer: null,
  layers: [],
  layerSteps: {},
  currentScheme: null,

  init(scheme) {
    this.stop();
    this.currentStep = -1;
    this.currentScheme = scheme;
    this._recalculateSteps();
    this.isActive = false;
  },

  _recalculateSteps() {
    const options = {};
    if (this.startLayer !== null && this.startLayer !== undefined) {
      options.startLayer = this.startLayer;
    }
    if (this.targetLayer !== null && this.targetLayer !== undefined) {
      options.targetLayer = this.targetLayer;
    }
    this.stepCalculatorResult = AssemblyStepCalculator.calculateSteps(this.currentScheme, options);
    this.steps = this.stepCalculatorResult.steps;
    this.allSteps = this.stepCalculatorResult.allSteps || this.steps;
    this.totalSteps = this.stepCalculatorResult.totalSteps;
    this.layers = this.stepCalculatorResult.layers || [];
    this.layerSteps = this.stepCalculatorResult.layerSteps || {};
  },

  activate() {
    this.isActive = true;
    this.notifyListeners();
  },

  deactivate() {
    this.stop();
    this.isActive = false;
    this.currentStep = -1;
    this.notifyListeners();
  },

  setScheme(scheme) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentScheme = scheme;
    this._recalculateSteps();
    this.currentStep = -1;
    if (wasPlaying && this.isActive) {
      this.play();
    }
    this.notifyListeners();
  },

  setPlaybackMode(mode) {
    this.playbackMode = mode === "manual" ? "manual" : "auto";
    if (this.playbackMode === "manual" && this.isPlaying) {
      this.pause();
    }
    this.notifyListeners();
  },

  setStartLayer(layer) {
    this.startLayer = (layer === null || layer === undefined) ? null : Number(layer);
    this._recalculateSteps();
    this.currentStep = -1;
    if (this.isPlaying) {
      this.pause();
    }
    this.notifyListeners();
  },

  setTargetLayer(layer) {
    this.targetLayer = (layer === null || layer === undefined) ? null : Number(layer);
    this._recalculateSteps();
    this.currentStep = -1;
    if (this.isPlaying) {
      this.pause();
    }
    this.notifyListeners();
  },

  clearLayerFilter() {
    this.startLayer = null;
    this.targetLayer = null;
    this._recalculateSteps();
    this.currentStep = -1;
    if (this.isPlaying) {
      this.pause();
    }
    this.notifyListeners();
  },

  hasSteps() {
    return this.totalSteps > 0;
  },

  getInstalledPartIds() {
    if (!this.stepCalculatorResult || !this.isActive) return null;
    return this.stepCalculatorResult.installedPartIds(this.currentStep);
  },

  getPreinstalledPartIds() {
    if (!this.stepCalculatorResult || !this.isActive) return [];
    return this.stepCalculatorResult.preinstalledPartIds || [];
  },

  getAllPartIdsUpToLayer() {
    if (!this.stepCalculatorResult || !this.isActive) return null;
    const effectiveMaxLayer = this.targetLayer || Math.max(...this.layers, 0);
    const parts = [];
    for (let i = 0; i < this.allSteps.length; i++) {
      if (this.allSteps[i].layer <= effectiveMaxLayer) {
        parts.push(this.allSteps[i].partId);
      }
    }
    return parts;
  },

  getCurrentStepInfo() {
    if (this.currentStep < 0 || this.currentStep >= this.steps.length) return null;
    return this.steps[this.currentStep];
  },

  getLayers() {
    return this.layers;
  },

  getLayerSteps() {
    return this.layerSteps;
  },

  goToLayerStart(layer) {
    if (!this.layerSteps[layer] || this.layerSteps[layer].length === 0) return false;
    const firstStepIdx = this.layerSteps[layer][0] - 1;
    return this.goToStep(firstStepIdx);
  },

  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.notifyListeners();
      return true;
    }
    this.stop();
    return false;
  },

  prevStep() {
    if (this.currentStep >= 0) {
      this.currentStep--;
      this.notifyListeners();
      return true;
    }
    return false;
  },

  goToStep(stepIndex) {
    if (stepIndex >= -1 && stepIndex < this.totalSteps) {
      this.currentStep = stepIndex;
      this.notifyListeners();
      return true;
    }
    return false;
  },

  play() {
    if (this.playbackMode === "manual") {
      this.nextStep();
      return;
    }
    if (this.isPlaying || this.totalSteps === 0 || !this.isActive) return;

    if (this.currentStep >= this.totalSteps - 1) {
      this.currentStep = -1;
    }

    this.isPlaying = true;
    this.playInterval = setInterval(() => {
      if (!this.nextStep()) {
        this.stop();
      }
    }, this.playSpeed);

    this.notifyListeners();
  },

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.notifyListeners();
  },

  stop() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.notifyListeners();
  },

  togglePlay() {
    if (this.playbackMode === "manual") {
      this.nextStep();
      return;
    }
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  setSpeed(speedMs) {
    this.playSpeed = Math.max(300, Math.min(5000, speedMs));
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
    this.notifyListeners();
  },

  reset() {
    this.stop();
    this.currentStep = -1;
    this.notifyListeners();
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (e) {
        console.error("Player listener error:", e);
      }
    });
  },

  getState() {
    return {
      isActive: this.isActive,
      isPlaying: this.isPlaying,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      playSpeed: this.playSpeed,
      playbackMode: this.playbackMode,
      startLayer: this.startLayer,
      targetLayer: this.targetLayer,
      layers: this.layers,
      layerSteps: this.layerSteps,
      currentStepInfo: this.getCurrentStepInfo(),
      installedPartIds: this.getInstalledPartIds(),
      preinstalledPartIds: this.getPreinstalledPartIds(),
      canGoNext: this.currentStep < this.totalSteps - 1,
      canGoPrev: this.currentStep >= 0
    };
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyPlayerState };
