import os

# Variáveis de configuração
SECRET_KEY = os.environ.get('SECRET_KEY', 'chave_super_segura')
CONFIG_PATH = '/etc/accel-ppp.conf'

# Usuários para login (mantenha um mínimo de usuários para fins de segurança)
USERS = {
    "admin": "admin123",
    "user": "user123"
}

BACKUP_DIR = '/etc/accel-ppp-backups'
