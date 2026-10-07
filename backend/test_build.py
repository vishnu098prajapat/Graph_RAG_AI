from app.config import Settings
from app.main import build_services

def test():
    s = Settings.from_env()
    print('building...')
    r, i, t = build_services(s)
    print('done')

test()
