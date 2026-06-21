const ComponentDetailRenderer = {
  render(componentType, options) {
    options = options || {};
    const data = ComponentData[componentType];
    if (!data) return "";

    const notesHtml = data.assemblyNotes.map((note, i) =>
      `<li class="detail-note-item"><span class="detail-note-num">${i + 1}</span>${note}</li>`
    ).join("");

    const issueTips = options.issueTips || [];
    let issueTipsHtml = "";

    if (issueTips.length > 0) {
      const tipsItems = issueTips.map(issue => {
        const sevClass = issue.severity === "error" ? "error" : "warning";
        const sevLabel = issue.severity === "error" ? "错误" : "警告";
        const tipList = issue.tips.map((tip, i) =>
          `<li class="issue-tip-item"><span class="issue-tip-num">${i + 1}</span>${tip}</li>`
        ).join("");

        return `
          <div class="issue-tip-group ${sevClass}">
            <div class="issue-tip-header">
              <span class="issue-sev-badge">${sevLabel}</span>
              <span class="issue-tip-title">${issue.title}</span>
            </div>
            <div class="issue-tip-message">${issue.message}</div>
            <ul class="issue-tip-list">
              ${tipList}
            </ul>
          </div>
        `;
      }).join("");

      issueTipsHtml = `
        <div class="detail-section issue-tips-section">
          <h4 class="detail-section-title">
            <span class="detail-icon issue-icon">⚠</span>当前问题修正提示
          </h4>
          <div class="issue-tips-container">
            ${tipsItems}
          </div>
        </div>
      `;
    }

    return `
      <div class="component-detail-card">
        <div class="detail-header">
          <div class="detail-title">
            <h3 class="detail-name">${data.name}</h3>
            <span class="detail-alias">${data.alias}</span>
          </div>
          <div class="detail-diagram">
            ${data.diagram}
          </div>
        </div>

        <div class="detail-sections">
          ${issueTipsHtml}

          <div class="detail-section">
            <h4 class="detail-section-title">
              <span class="detail-icon">◆</span>用途说明
            </h4>
            <p class="detail-section-content">${data.purpose}</p>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">
              <span class="detail-icon">◆</span>常见位置
            </h4>
            <p class="detail-section-content">${data.position}</p>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">
              <span class="detail-icon">◆</span>装配注意事项
            </h4>
            <ol class="detail-notes-list">
              ${notesHtml}
            </ol>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof module !== "undefined") module.exports = { ComponentDetailRenderer };
