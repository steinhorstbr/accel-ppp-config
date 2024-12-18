from flask import Flask, request, jsonify, render_template, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # Altere para uma chave segura
CONFIG_PATH = '/etc/accel-ppp.conf'

ADMIN_USER = 'admin'  # Usuário padrão
ADMIN_PASS = 'admin'  # Senha padrão


def parse_config():
    """Função para ler e processar o arquivo de configuração."""
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


def write_config(config):
    """Função para salvar o arquivo de configuração."""
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


@app.route('/', methods=['GET', 'POST'])
def login():
    """Página de login."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == ADMIN_USER and password == ADMIN_PASS:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error="Usuário ou senha incorretos.")
    return render_template('login.html')


@app.route('/config', methods=['GET'])
def index():
    """Página principal de configuração."""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')


@app.route('/get-config', methods=['GET'])
def get_config():
    """Endpoint para retornar a configuração atual."""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        return jsonify(parse_config())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/save-config', methods=['POST'])
def save_config():
    """Endpoint para salvar a configuração."""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    try:
        write_config(request.json)
        return jsonify({"message": "Configuração salva com sucesso!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/logout', methods=['GET'])
def logout():
    """Encerrar a sessão."""
    session.pop('logged_in', None)
    return redirect(url_for('login'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
