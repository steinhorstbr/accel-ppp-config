import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'chave_super_segura')
CONFIG_PATH = '/etc/accel-ppp.conf'

# Usuários para login
USERS = {
    "admin": "admin123",
    "user": "user123"
}

BACKUP_DIR = '/etc/accel-ppp-backups'
