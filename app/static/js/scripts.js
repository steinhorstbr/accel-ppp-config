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

            // Itens ativáveis/desativáveis com Toggle Switch
            section.content.forEach(item => {
                if (item.type === "item") {
                    sectionDiv += `
                        <div class="mb-3 d-flex align-items-center">
                            <input type="text" class="form-control me-2" value="${item.line}" data-section="${section.name}">
                            <div class="form-check form-switch">
                                <input class="form-check-input toggle-switch" type="checkbox" ${item.enabled ? "checked" : ""} onchange="toggleItem(this)">
                            </div>
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

// Função para alternar entre ativar e desativar um item
function toggleItem(toggleSwitch) {
    const label = $(toggleSwitch).next(".form-check-label");
    if (toggleSwitch.checked) {
        label.text("Ativado");
    } else {
        label.text("Desativado");
    }
}

// Função para adicionar uma nova interface
function addInterface(section) {
    const sectionContent = $(`#${section}-content`);
    sectionContent.append(`
        <div class="mb-3 d-flex align-items-center">
            <input type="text" class="form-control me-2" placeholder="Nova interface" value="interface=" data-section="${section}">
            <div class="form-check form-switch">
                <input class="form-check-input toggle-switch" type="checkbox" checked onchange="toggleItem(this)">
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteItem(this)"><i class="fa fa-trash"></i></button>
        </div>
    `);
}

// Função para deletar um item
function deleteItem(button) {
    $(button).closest(".mb-3").remove();
}

// Função para salvar as configurações com restart automático
function saveConfig() {
    // Mostra indicador de loading
    const saveButton = $('.btn-success:contains("Salvar")');
    const originalText = saveButton.html();
    saveButton.html('<i class="fa fa-spinner fa-spin"></i> Salvando e Reiniciando...');
    saveButton.prop('disabled', true);

    let config = [];

    $("#sections .card").each(function () {
        const sectionName = $(this).find(".card-header strong").text();
        let section = { type: "section", name: sectionName, content: [] };

        $(this).find(".form-control").each(function () {
            const lineContent = $(this).val();
            const isEnabled = $(this).siblings('.form-check').find('.toggle-switch').is(':checked');
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
    .then(response => {
        return response.json().then(data => ({
            status: response.status,
            data: data
        }));
    })
    .then(result => {
        const { status, data } = result;
        
        // Restaura o botão
        saveButton.html(originalText);
        saveButton.prop('disabled', false);

        if (status === 200) {
            // Sucesso total
            showAlert(data.message, 'success');
            if (data.restart_log) {
                console.log('Log do restart:', data.restart_log);
            }
        } else if (status === 206) {
            // Sucesso parcial (configuração salva, mas restart falhou)
            showAlert(data.message, 'warning');
            if (data.restart_log) {
                showRestartLog(data.restart_log);
            }
        } else {
            // Erro
            showAlert(data.error || "Erro desconhecido", 'error');
        }

        // Recarrega a página após 3 segundos
        setTimeout(function () {
            location.reload();
        }, 3000);
    })
    .catch(error => {
        // Restaura o botão
        saveButton.html(originalText);
        saveButton.prop('disabled', false);
        
        showAlert("Erro ao salvar configurações: " + error, 'error');
    });
}

// Função para mostrar alertas melhorados
function showAlert(message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'warning' ? 'alert-warning' : 
                      'alert-danger';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show mt-3" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Remove alertas anteriores
    $('.alert').remove();
    
    // Adiciona o novo alerta
    $('.container').prepend(alertHtml);
    
    // Auto-remove após 5 segundos
    setTimeout(() => {
        $('.alert').fadeOut();
    }, 5000);
}

// Função para mostrar log do restart
function showRestartLog(log) {
    const modal = `
        <div class="modal fade" id="restartLogModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Log do Restart</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <pre class="bg-light p-3">${log}</pre>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modal);
    $('#restartLogModal').modal('show');
    
    // Remove modal após fechar
    $('#restartLogModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

// Função para fazer upload do arquivo de configurações
function uploadConfig() {
    const fileInput = $('#file-upload')[0];
    const file = fileInput.files[0];

    if (file) {
        // Mostra indicador de loading
        const uploadButton = $('.btn-success:contains("Upload")');
        const originalText = uploadButton.html();
        uploadButton.html('<i class="fa fa-spinner fa-spin"></i> Enviando e Reiniciando...');
        uploadButton.prop('disabled', true);

        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload-config', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Restaura o botão
            uploadButton.html(originalText);
            uploadButton.prop('disabled', false);
            
            showAlert(data.message, data.status || 'success');
            
            if (data.restart_log) {
                showRestartLog(data.restart_log);
            }
            
            // Recarrega após 3 segundos
            setTimeout(() => location.reload(), 3000);
        })
        .catch(error => {
            // Restaura o botão
            uploadButton.html(originalText);
            uploadButton.prop('disabled', false);
            
            showAlert("Erro ao fazer upload da configuração: " + error, 'error');
        });
    } else {
        showAlert("Por favor, selecione um arquivo.", 'warning');
    }
}

// Função de logout
function logout() {
    window.location.href = '/logout';
}

// Função de alternância de tema
function toggleTheme() {
    $('body').toggleClass('dark-theme');
    const themeIcon = $('#theme-icon');

    if ($('body').hasClass('dark-theme')) {
        themeIcon.removeClass('fa-sun').addClass('fa-moon');
    } else {
        themeIcon.removeClass('fa-moon').addClass('fa-sun');
    }
}

// Função para executar o comando "accel-cmd reload" (mantida para compatibilidade)
function reloadConfig() {
    fetch('/reload-config', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => alert("Comando Executado:\n\n" + data.log))
    .catch(error => alert("Erro ao executar o comando: " + error));
}

// Nova função para restart manual do serviço
function restartService() {
    const restartButton = $('.btn-primary:contains("Reload")');
    const originalText = restartButton.html();
    restartButton.html('<i class="fa fa-spinner fa-spin"></i> Reiniciando...');
    restartButton.prop('disabled', true);

    fetch('/restart-service', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        // Restaura o botão
        restartButton.html(originalText);
        restartButton.prop('disabled', false);
        
        showAlert(data.message, data.status || 'success');
        
        if (data.log) {
            showRestartLog(data.log);
        }
    })
    .catch(error => {
        // Restaura o botão
        restartButton.html(originalText);
        restartButton.prop('disabled', false);
        
        showAlert("Erro ao reiniciar o serviço: " + error, 'error');
    });
}
