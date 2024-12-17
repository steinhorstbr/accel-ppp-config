from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_file
import datetime

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # Altere para algo seguro
CONFIG_PATH = '/etc/accel-ppp.conf'
LOG_FILE = 'logs/changes.log'

ADMIN_USER = 'admin'
ADMIN_PASS = 'admin'

# Função para parsear o arquivo de configuração
def parse_config():
    config = []
    current_section = None
    with open(CONFIG_PATH, 'r') as file:
        for line in file:
            stripped = line.strip()
            if stripped.startswith('[') and stripped.endswith(']'):
                if current_section:
                    config.append(current_section)
                current_section = {'type': 'section', 'name': stripped[1:-1], 'content': []}
            elif stripped.startswith('###'):
                current_section['content'].append({'type': 'note', 'text': stripped[3:].strip()})
            elif stripped.startswith('#'):
                current_section['content'].append({'type': 'item', 'line': stripped[1:], 'enabled': False})
            elif stripped:
                current_section['content'].append({'type': 'item', 'line': stripped, 'enabled': True})
        if current_section:
            config.append(current_section)
    return config

# Função para gravar o arquivo de configuração
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

# Log de alterações
def log_changes(user, changes):
    with open(LOG_FILE, 'a') as log:
        log.write(f"{datetime.datetime.now()} - Usuário: {user}\n")
        log.write(f"Alterações: {changes}\n\n")

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if request.form['username'] == ADMIN_USER and request.form['password'] == ADMIN_PASS:
            session['logged_in'] = True
            return redirect(url_for('index'))
        return render_template('login.html', error="Usuário ou senha incorretos")
    return render_template('login.html')

@app.route('/config', methods=['GET'])
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/get-config', methods=['GET'])
def get_config():
    return jsonify(parse_config())

@app.route('/save-config', methods=['POST'])
def save_config():
    config = request.json
    write_config(config)
    log_changes('admin', config)
    return jsonify({"message": "Configuração salva com sucesso!"})

@app.route('/download-config', methods=['GET'])
def download_config():
    return send_file(CONFIG_PATH, as_attachment=True, download_name="accel-ppp.conf")

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
