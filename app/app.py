import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, send_file, session
from utils import parse_config, write_config, create_backup, validate_config, run_command
from config import SECRET_KEY, CONFIG_PATH, USERS

app = Flask(__name__)
app.secret_key = SECRET_KEY

# Página de login
@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in USERS and USERS[username] == password:
            session['logged_in'] = True
            return redirect(url_for('index'))
        return render_template('login.html', error="Usuário ou senha incorretos.")
    return render_template('login.html')

# Página principal
@app.route('/config', methods=['GET'])
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')

# API para carregar configurações
@app.route('/api/config', methods=['GET'])
def get_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    return jsonify(parse_config())

# API para salvar configurações
@app.route('/api/config', methods=['POST'])
def save_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    config = request.json
    if validate_config(config):
        create_backup(CONFIG_PATH)
        write_config(config)
        return jsonify({"message": "Configuração salva com sucesso!"})
    return jsonify({"error": "Configuração inválida"}), 400

# API para upload do arquivo de configurações
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    file = request.files['file']
    if file and file.filename.endswith('.conf'):
        file.save(CONFIG_PATH)
        return jsonify({"message": "Arquivo carregado com sucesso!"})
    return jsonify({"error": "Arquivo inválido ou não suportado."}), 400

# API para baixar o arquivo
@app.route('/api/download', methods=['GET'])
def download_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    return send_file(CONFIG_PATH, as_attachment=True)

# API para executar o comando "accel-cmd reload"
@app.route('/api/reload', methods=['POST'])
def reload_config():
    if not session.get('logged_in'):
        return jsonify({"error": "Acesso não autorizado"}), 401
    output = run_command('accel-cmd reload')
    return jsonify({"message": "Comando reload executado com sucesso.", "output": output})

# API para logout
@app.route('/logout', methods=['GET'])
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
