const ComponentDetailRenderer = {
  render(componentType) {
    const data = ComponentData[componentType];
    if (!data) return "";

    const notesHtml = data.assemblyNotes.map((note, i) =>
      `<li class="detail-note-item"><span class="detail-note-num">${i + 1}</span>${note}</li>`
    ).join("");

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
