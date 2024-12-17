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
    .then(data => Swal.fire("Sucesso!", data.message, "success"))
    .catch(error => Swal.fire("Erro!", "Falha ao salvar configurações", "error"));
}
