import importlib.util
import json
from pathlib import Path

spec=importlib.util.spec_from_file_location('creator_public_access',Path(__file__).resolve().parents[1]/'creator_public_access.py')
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)


def test_build_guard_removes_legacy_research_and_unknown_profile_fields(tmp_path):
    path=tmp_path/'kol-feed.json'
    path.write_text(json.dumps({'kols':[{'id':'example','profile':{'subscriber_count':5,'raw_path':'PRIVATE'}}],
                                'posts':[{'title':'PRIVATE','summary':'PRIVATE','calls':['PRIVATE']}]}))
    guard.sanitize_creator_catalog(tmp_path)
    doc=json.loads(path.read_text())
    assert 'PRIVATE' not in path.read_text()
    assert doc['posts']==[] and doc['kols'][0]['profile']=={'subscriber_count':5}
    guard.sanitize_creator_catalog(tmp_path)
    assert json.loads(path.read_text())==doc
