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
                    <button class="btn btn-sm btn-primary" onclick="toggleSection('${section.name}')">
                        Esconder/Mostrar
                    </button>
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

    // Coleta de dados
    $("#sections .card").each(function () {
        const sectionName = $(this).find(".card-header strong").text();
        let section = { name: sectionName, items: [] };

        $(this).find(".d-flex").each(function () {
            const input = $(this).find(".form-control");
            const lineContent = input.val();
            const enabled = $(this).find(".btn").hasClass("btn-success");

            if (lineContent.startsWith("###")) {
                section.items.push({ type: "note", text: lineContent.substring(3).trim() });
            } else {
                section.items.push({ type: "item", line: lineContent, enabled: enabled });
            }
        });

        config.push(section);
    });

    // Envia ao backend
    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                Swal.fire("Sucesso!", data.message, "success");
            } else {
                Swal.fire("Erro!", data.error, "error");
            }
        })
        .catch(error => {
            console.error("Erro ao salvar configurações:", error);
            Swal.fire("Erro!", "Falha ao salvar configurações.", "error");
        });
}
