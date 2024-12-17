import subprocess
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)
app.secret_key = 'supersecretkey'
CONFIG_PATH = '/etc/accel-ppp.conf'
LOG_PATH = '/var/log/accel-ppp/accel-ppp.log'

ADMIN_USER = 'admin'
ADMIN_PASS = 'admin'

# Função para ler a configuração
def parse_config():
    config = []
    current_section = None
    with open(CONFIG_PATH, 'r') as file:
        for line in file:
            stripped = line.strip()
            # Seção
            if stripped.startswith('[') and stripped.endswith(']'):
                if current_section:
                    config.append(current_section)
                current_section = {'type': 'section', 'name': stripped[1:-1], 'content': []}
            # Notas (###)
            elif stripped.startswith('###'):
                if current_section:
                    current_section['content'].append({'type': 'note', 'text': stripped[3:].strip()})
            # Itens desativados (#)
            elif stripped.startswith('#'):
                if current_section:
                    current_section['content'].append({'type': 'item', 'line': stripped[1:].strip(), 'enabled': False})
            # Itens ativados
            elif stripped:
                if current_section:
                    current_section['content'].append({'type': 'item', 'line': stripped, 'enabled': True})
        
        if current_section:
            config.append(current_section)
    return config


# Função para salvar a configuração
def write_config(config):
    with open(CONFIG_PATH, 'w') as file:
        for section in config:
            file.write(f"[{section['name']}]\n")
            for item in section['content']:
                if item['type'] == 'note':
                    file.write(f"### {item['text']}\n")
                elif item['type'] == 'item':
                    prefix = '' if item['enabled'] else '#'
                    file.write(f"{prefix}{item['line']}\n")
            file.write('\n')


# Rota para obter a configuração atual
@app.route('/get-config', methods=['GET'])
def get_config():
    try:
        return jsonify(parse_config())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Rota para salvar a configuração
@app.route('/save-config', methods=['POST'])
def save_config():
    try:
        write_config(request.json)
        return jsonify({"message": "Configuração salva com sucesso!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Rota para baixar o arquivo de configuração
@app.route('/download-config', methods=['GET'])
def download_config():
    return send_file(CONFIG_PATH, as_attachment=True)


# Rota para executar o comando 'accel-cmd reload' e retornar o log
@app.route('/reload-config', methods=['POST'])
def reload_config():
    try:
        # Executar o comando accel-cmd reload
        result = subprocess.run(['accel-cmd', 'reload'], capture_output=True, text=True)
        
        if result.returncode != 0:
            return jsonify({"error": "Erro ao executar o comando."}), 500

        # Retornar o log
        with open(LOG_PATH, 'r') as log_file:
            log_data = log_file.read()

        return jsonify({"message": "Configuração recarregada com sucesso!", "log": log_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
