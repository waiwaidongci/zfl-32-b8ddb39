const AssemblyPlayerState = {
  isPlaying: false,
  currentStep: -1,
  totalSteps: 0,
  playInterval: null,
  playSpeed: 1500,
  steps: [],
  stepCalculatorResult: null,
  isActive: false,
  listeners: [],

  init(scheme) {
    this.stop();
    this.currentStep = -1;
    this.stepCalculatorResult = AssemblyStepCalculator.calculateSteps(scheme);
    this.steps = this.stepCalculatorResult.steps;
    this.totalSteps = this.stepCalculatorResult.totalSteps;
    this.isActive = false;
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
    this.stepCalculatorResult = AssemblyStepCalculator.calculateSteps(scheme);
    this.steps = this.stepCalculatorResult.steps;
    this.totalSteps = this.stepCalculatorResult.totalSteps;
    this.currentStep = -1;
    if (wasPlaying && this.isActive) {
      this.play();
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

  getCurrentStepInfo() {
    if (this.currentStep < 0 || this.currentStep >= this.steps.length) return null;
    return this.steps[this.currentStep];
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
      currentStepInfo: this.getCurrentStepInfo(),
      installedPartIds: this.getInstalledPartIds(),
      canGoNext: this.currentStep < this.totalSteps - 1,
      canGoPrev: this.currentStep >= 0
    };
  }
};

if (typeof module !== "undefined") module.exports = { AssemblyPlayerState };
