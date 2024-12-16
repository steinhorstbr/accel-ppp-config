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
                    <div class="card-header"><strong>${section.name}</strong></div>
                    <div class="card-body" id="${section.name}-content">`;

            // Notas (###)
            section.content.forEach(item => {
                if (item.type === "note") {
                    sectionDiv += `<div class="alert alert-info">${item.text}</div>`;
                }
            });

            // Dropdown para a seção [modules]
            if (section.name === "modules") {
                sectionDiv += `
                    <label for="modules-dropdown" class="form-label">Módulos</label>
                    <select multiple class="form-select mb-3" id="modules-dropdown">
                        ${section.content
                            .filter(item => item.type === "item")
                            .map(item =>
                                `<option value="${item.line}" ${item.enabled ? "selected" : ""}>${item.line}</option>`
                            )
                            .join("")}
                    </select>`;
            }

            // Campos para outras seções
            section.content.forEach(item => {
                if (item.type === "item" && section.name !== "modules") {
                    sectionDiv += `
                        <div class="mb-3 d-flex align-items-center">
                            <input type="text" class="form-control me-2" value="${item.line}" data-section="${section.name}">
                            <button type="button" class="btn btn-danger btn-sm" onclick="deleteItem(this)">Deletar</button>
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

// Função para adicionar uma nova interface
function addInterface(section) {
    const sectionContent = $(`#${section}-content`);
    sectionContent.append(`
        <div class="mb-3 d-flex align-items-center">
            <input type="text" class="form-control me-2" placeholder="Nova interface" data-section="${section}">
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
        const sectionName = $(this).find(".card-header").text();
        let section = { type: "section", name: sectionName, content: [] };

        // Processar dropdown para [modules]
        if (sectionName === "modules") {
            $("#modules-dropdown option").each(function () {
                section.content.push({
                    type: "item",
                    line: $(this).val(),
                    enabled: $(this).is(":selected")
                });
            });
        }

        // Processar itens regulares
        $(this).find(".form-control").each(function () {
            const lineContent = $(this).val();
            section.content.push({
                type: "item",
                line: lineContent,
                enabled: true
            });
        });

        // Adicionar notas
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
