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
                        ${
                            section.name === "modules"
                                ? `<button class="btn btn-sm btn-primary" onclick="toggleModules('${section.name}')">Esconder/Mostrar Módulos</button>`
                                : ""
                        }
                    </div>
                    <div class="card-body" id="${section.name}-content">`;

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
                            <div class="form-check me-2">
                                <input class="form-check-input" type="checkbox" ${item.enabled ? "checked" : ""}>
                                <label class="form-check-label">${item.enabled ? "Ativado" : "Desativado"}</label>
                            </div>
                            ${
                                section.name === "pppoe" || section.name === "ipoe"
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

// Função para esconder/mostrar os módulos
function toggleModules(section) {
    const sectionContent = $(`#${section}-content`);
    sectionContent.toggle();
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
        const sectionName = $(this).find(".card-header strong").text();
        let section = { type: "section", name: sectionName, content: [] };

        $(this).find(".form-control").each(function () {
            const lineContent = $(this).val();
            const isEnabled = $(this).next(".form-check").find(".form-check-input").is(":checked");
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
