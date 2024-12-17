$(document).ready(function () {
    fetchConfig();
    setupInactivityTimer();
});

function fetchConfig() {
    fetch('/get-config')
        .then(res => res.json())
        .then(data => populateSections(data));
}

function populateSections(config) {
    let sections = $("#sections");
    sections.empty();
    config.forEach(section => {
        let content = `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between">
                    <strong>${section.name}</strong>
                    <button class="btn btn-sm btn-primary" onclick="toggleSection('${section.name}')">Esconder/Mostrar</button>
                </div>
                <div class="card-body" id="${section.name}-content" style="display: none;">`;

        section.content.forEach(item => {
            if (item.type === "note") {
                content += `<div class="alert alert-info">${item.text}</div>`;
            } else {
                content += `
                    <div class="mb-3 d-flex align-items-center">
                        <input type="text" class="form-control me-2" value="${item.line}">
                        <button class="btn btn-sm toggle-btn" onclick="toggleItem(this)" data-enabled="${item.enabled}">
                            <i class="bi ${item.enabled ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i>
                        </button>
                        ${item.line.startsWith('interface=') ? `<button class="btn btn-danger btn-sm" onclick="deleteItem(this)">Deletar</button>` : ""}
                    </div>`;
            }
        });

        content += `</div></div>`;
        sections.append(content);
    });
}

function toggleSection(section) {
    $(`#${section}-content`).toggle();
}

function toggleItem(button) {
    let enabled = $(button).data('enabled');
    $(button).data('enabled', !enabled);
    let icon = $(button).find('i');
    icon.toggleClass('bi-check-circle-fill text-success bi-x-circle-fill text-danger');
}

function deleteItem(button) {
    if (confirm("Deseja deletar este item?")) $(button).closest('.mb-3').remove();
}

function downloadConfig() {
    window.location.href = '/download-config';
}

function saveConfig() {
    // Implementação de salvamento
}

function setupInactivityTimer() {
    let idleTime = 0;
    setInterval(() => { if (++idleTime >= 15) window.location.href = '/logout'; }, 60000);
    $(document).on('mousemove keypress', () => idleTime = 0);
}
