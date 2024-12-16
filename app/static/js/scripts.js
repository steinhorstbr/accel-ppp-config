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

            section.content.forEach(item => {
                if (item.type === "note") {
                    sectionDiv += `<div class="alert alert-info">${item.text}</div>`;
                } else if (item.type === "item") {
                    sectionDiv += `
                        <div class="mb-3">
                            <input type="text" class="form-control mb-1" value="${item.line}" data-section="${section.name}">
                            <div class="form-check mt-1">
                                <input class="form-check-input" type="checkbox" ${item.enabled ? "checked" : ""}>
                                <label class="form-check-label">Ativado</label>
                            </div>
                        </div>`;
                }
            });

            sectionDiv += `</div></div>`;
            sections.append(sectionDiv);
        }
    });
}

// Função para salvar as configurações
function saveConfig() {
    let config = [];

    $("#sections .card").each(function () {
        const sectionName = $(this).find(".card-header").text();
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
