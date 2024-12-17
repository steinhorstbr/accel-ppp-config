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

            // Itens ativáveis/desativáveis com ícones modernos
            section.content.forEach(item => {
                if (item.type === "item") {
                    const iconClass = item.enabled ? "fas fa-check-circle text-success" : "fas fa-times-circle text-danger";
                    sectionDiv += `
                        <div class="mb-3 d-flex align-items-center">
                            <input type="text" class="form-control me-2" value="${item.line}" data-section="${section.name}">
                            <div class="form-check me-2">
                                <input class="form-check-input toggle-item" type="checkbox" ${item.enabled ? "checked" : ""} onchange="toggleItem(this)">
                                <label class="form-check-label">${item.enabled ? "Ativado" : "Desativado"}</label>
                            </div>
                            <button class="icon-button" onclick="toggleItem(this)">
                                <i class="fa ${iconClass}"></i>
                            </button>
                            ${
                                item.line.startsWith("interface=")
                                    ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteItem(this)"><i class="fa fa-trash"></i></button>`
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

// Função para alternar entre ativar e desativar um item com ícones modernos
function toggleItem(checkbox) {
    const label = $(checkbox).next(".form-check-label");
    const icon = $(checkbox).siblings(".icon-button").children("i");

    if (checkbox.checked) {
        label.text("Ativado");
        icon.removeClass("fa-times-circle text-danger").addClass("fa-check-circle text-success");
    } else {
        label.text("Desativado");
        icon.removeClass("fa-check-circle text-success").addClass("fa-times-circle text-danger");
    }
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
        .then(data => {
            alert(data.message || "Configuração salva com sucesso!");
            setTimeout(function () {
                location.reload();
            }, 3000); // Atualiza a página após 3 segundos
        })
        .catch(error => alert("Erro ao salvar configurações: " + error));
}

// Função para fazer upload do arquivo de configurações
function uploadConfig() {
    const fileInput = $('#file-upload')[0];
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload-config', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || "Configuração carregada com sucesso!");
            location.reload(); // Atualiza a página após o upload
        })
        .catch(error => alert("Erro ao fazer upload da configuração: " + error));
    } else {
        alert("Por favor, selecione um arquivo.");
    }
}

// Função para baixar o arquivo de configuração
function downloadConfig() {
    window.location.href = '/download-config';  // Redireciona para o endpoint de download
}

// Função para recarregar a configuração
function reloadConfig() {
    fetch('/reload-config')
        .then(response => response.json())
        .then(data => alert(data.message || "Configuração recarregada com sucesso!"))
        .catch(error => alert("Erro ao recarregar a configuração: " + error));
}

// Função de logout
function logout() {
    window.location.href = '/logout';
}
