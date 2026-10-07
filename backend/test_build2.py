from app.config import Settings
from app.main import build_services

def test():
    s = Settings.from_env()
    print('building...')
    registry, ingestion, retriever = build_services(s)
    print('done building, looping ids...')
    if s.store == 'memory':
        for doc_id in registry.all_ids():
            print('ingesting', doc_id)
            pages = sorted(registry.pages(doc_id).values(), key=lambda p: p.number)
            ingestion.ingest_pages(registry.filename(doc_id), pages, doc_id=doc_id)
            print('re-indexed', doc_id)
    print('done test')

test()
