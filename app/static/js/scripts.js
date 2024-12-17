$(document).ready(function () {
    fetch('/api/config')
        .then(response => response.json())
        .then(data => populateSections(data))
        .catch(error => alert("Erro ao carregar configurações: " + error));
});

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

        section.items.forEach(item => {
            if (item.type === "note") {
                sectionDiv += `<div class="alert alert-info">${item.text}</div>`;
            } else if (item.type === "item") {
                sectionDiv += `
                    <div class="d-flex align-items-center mb-2">
                        <input type="text" class="form-control me-2" value="${item.line}">
                        <button class="btn btn-sm ${item.enabled ? 'btn-success' : 'btn-danger'} me-2" onclick="toggleItem(this)">
                            <i class="bi ${item.enabled ? 'bi-check-circle' : 'bi-x-circle'}"></i>
                        </button>
                        ${item.line.startsWith("interface=") 
                            ? `<button class="btn btn-sm btn-danger" onclick="deleteItem(this)">
                                <i class="bi bi-trash"></i> Deletar
                            </button>` : ""}
                    </div>`;
            }
        });

        sectionDiv += `</div></div>`;
        sections.append(sectionDiv);
    });
}

function toggleSection(sectionName) {
    $(`#${sectionName}-content`).toggle();
}

function toggleItem(button) {
    const icon = $(button).find("i");
    if ($(button).hasClass('btn-success')) {
        $(button).removeClass('btn-success').addClass('btn-danger');
        icon.removeClass('bi-check-circle').addClass('bi-x-circle');
    } else {
        $(button).removeClass('btn-danger').addClass('btn-success');
        icon.removeClass('bi-x-circle').addClass('bi-check-circle');
    }
}

function deleteItem(button) {
    $(button).closest(".d-flex").remove();
}

function saveConfig() {
    let config = [];

    $("#sections .card").each(function () {
        const sectionName = $(this).find(".card-header strong").text();
        let section = { name: sectionName, items: [] };

        $(this).find(".form-control").each(function () {
            const lineContent = $(this).val();
            const enabled = $(this).next(".btn").hasClass("btn-success");
            section.items.push({
                type: "item",
                line: lineContent,
                enabled: enabled
            });
        });

        section.items.push({
            type: "note",
            text: "Exemplo de nota"
        });

        config.push(section);
    });

    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        Swal.fire("Sucesso!", data.message, "success");
        setTimeout(function() {
            location.reload();  // Atualiza a página após 3 segundos
        }, 3000);
    })
    .catch(error => Swal.fire("Erro!", "Falha ao salvar configurações", "error"));
}

// Função para upload de arquivo
function uploadConfig() {
    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecione um arquivo para upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        Swal.fire("Sucesso!", data.message, "success");
    })
    .catch(error => Swal.fire("Erro!", "Falha ao carregar o arquivo.", "error"));
}
