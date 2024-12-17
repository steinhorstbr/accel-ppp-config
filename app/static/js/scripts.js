$(document).ready(function () {
    console.log("Carregando configurações...");
    fetch('/api/config') // Chamando o endpoint para buscar os dados
        .then(response => {
            if (!response.ok) {
                throw new Error("Erro ao buscar as configurações.");
            }
            return response.json();
        })
        .then(data => {
            console.log("Configurações carregadas:", data);
            populateSections(data);
        })
        .catch(error => {
            console.error("Erro ao carregar configurações:", error);
            alert("Erro ao carregar configurações. Verifique o console.");
        });
});

// Função para renderizar as seções na página
function populateSections(config) {
    let sections = $("#sections");
    sections.empty();

    config.forEach(section => {
        let sectionDiv = `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <strong>${section.name}</strong>
                    <button class="btn btn-sm btn-primary" onclick="toggleSection('${section.name}')">Esconder/Mostrar</button>
                </div>
                <div class="card-body" id="${section.name}-content" style="display: none;">`;

        // Renderizar itens e notas
        section.items.forEach(item => {
            if (item.type === "note") {
                sectionDiv += `<div class="alert alert-info">${item.text}</div>`;
            } else if (item.type === "item") {
                sectionDiv += `
                    <div class="mb-3 d-flex align-items-center">
                        <input type="text" class="form-control me-2" value="${item.line}">
                        <button class="btn toggle-item me-2" onclick="toggleItem(this)" data-enabled="${item.enabled}">
                            <i class="bi ${item.enabled ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i>
                        </button>
                    </div>`;
            }
        });

        sectionDiv += `</div></div>`;
        sections.append(sectionDiv);
    });
}

// Função para esconder/mostrar uma seção
function toggleSection(sectionName) {
    $(`#${sectionName}-content`).toggle();
}

// Função para ativar/desativar um item
function toggleItem(button) {
    const isEnabled = $(button).data("enabled");
    const newState = !isEnabled;
    $(button).data("enabled", newState);

    const icon = $(button).find("i");
    if (newState) {
        icon.removeClass("bi-x-circle-fill text-danger").addClass("bi-check-circle-fill text-success");
    } else {
        icon.removeClass("bi-check-circle-fill text-success").addClass("bi-x-circle-fill text-danger");
    }
}

// Função para salvar as configurações
function saveConfig() {
    alert("Funcionalidade de salvar ainda está em teste!");
}
