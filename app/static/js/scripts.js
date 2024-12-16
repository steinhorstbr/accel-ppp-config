// Carregar configurações do backend
$(document).ready(function () {
    fetch('/get-config')
        .then(response => response.json())
        .then(data => populateSections(data))
        .catch(error => alert("Erro ao carregar configurações: " + error));
});

// Função para preencher a página com as configurações
function populateSections(config) {
    let sections = $("#sections");
    sections.empty();

    config.forEach(section => {
        if (section.type === "section") {
            let sectionDiv = `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <strong>${section.name}</strong>
                        <button class="btn btn-sm btn-primary" onclick="toggleSection('${section.name}')">Esconder/Mostrar</button>
                    </div>
                    <div class="card-body" id="${section.name}-content" style="display: none;">`;

            // Notas (###)
            section.content.forEach(item => {
                if (item.type === "note") {
                    sectionDiv += `<div class="alert alert-info">${item.text}</div>`;
                }
            });

            // Itens ativáveis/desativáveis
            section.content.forEach(item => {
                if (item.type === "item") {
                    sectionDiv += `
                        <div class="mb-3 d-flex align-items-center">
                            <input type="text" class="form-control me-2" value="${item.line}" data-section="${section.name}">
                            <button type="button" class="btn toggle-item me-2" onclick="toggleItem(this)" data-enabled="${item.enabled}">
                                <i class="bi ${item.enabled ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i>
                            </button>
                            ${
                                item.line.startsWith("interface=")
                                    ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteItem(this)">Deletar</button>`
                                    : ""
                            }
                        </div>`;
                }
            });

            // Botão para adicionar interface em [pppoe] e [ipoe]
            if (section.name === "pppoe" || section.name === "ipoe") {
                sectionDiv += `
                    <button type="button" class="btn btn-secondary" onclick="addInterface('${section.name}')">Adicionar Interface</button>`;
            }

            sectionDiv += `</div></div>`;
            sections.append(sectionDiv);
        }
    });
}

// Função para esconder/mostrar itens de uma seção
function toggleSection(section) {
    const sectionContent = $(`#${section}-content`);
    sectionContent.toggle();
}

// Função para alternar entre ativar e desativar um item
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

// Função para adicionar uma nova interface
function addInterface(section) {
    const sectionContent = $(`#${section}-content`);
    sectionContent.append(`
        <div class="mb-3 d-flex align-items-center">
            <input type="text" class="form-control me-2" placeholder="Nova interface" value="interface=" data-section="${section}">
            <button type="button" class="btn toggle-item me-2" onclick="toggleItem(this)" data-enabled="true">
                <i class="bi bi-check-circle-fill text-success"></i>
            </button>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteItem(this)">Deletar</button>
        </div>
    `);
}

// Função para deletar um item
function deleteItem(button) {
    $(button).closest(".mb-3").remove();
}

// Função para salvar as configurações
function saveConfig() {
    let config = [];

    $("#sections .card").each(function () {
        const sectionName = $(this).find(".card-header strong").text();
        let section = { type: "section", name: sectionName, content: [] };

        $(this).find(".form-control").each(function () {
            const lineContent = $(this).val();
            const isEnabled = $(this).next(".toggle-item").data("enabled");
            section.content.push({
                type: "item",
                line: lineContent,
                enabled: isEnabled
            });
        });

        $(this).find(".alert-info").each(function () {
            section.content.push({
                type: "note",
                text: $(this).text()
            });
        });

        config.push(section);
    });

    fetch('/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
        .then(response => response.json())
        .then(data => alert(data.message || "Configuração salva com sucesso!"))
        .catch(error => alert("Erro ao salvar configurações: " + error));
}
