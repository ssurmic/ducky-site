"""Explicit public creator catalog. Research posts never cross this allowlist."""
import json

FIELDS = ('id','name','platform','lang','descr','avatar','handle','url')
PROFILE_FIELDS = ('title','description','country','published_at','subscriber_count',
                  'video_count','view_count','custom_url','fetched_at')


def public_catalog(doc):
    creators=[]
    for row in doc.get('kols',[]):
        if not isinstance(row,dict):continue
        value={k:row[k] for k in FIELDS if k in row and (isinstance(row[k],(str,int,float,bool)) or row[k] is None)}
        profile=row.get('profile',{})
        if isinstance(profile,str):
            try:profile=json.loads(profile)
            except ValueError:profile={}
        value['profile']={k:profile[k] for k in PROFILE_FIELDS if isinstance(profile,dict) and
                          isinstance(profile.get(k),(str,int,float,bool))}
        creators.append(value)
    posts=doc.get('posts',[])
    coverage={k:v for k,v in doc.get('coverage',{}).items() if k in {'indexed_posts','reviewed_posts'} and
              isinstance(v,int) and not isinstance(v,bool) and v>=0}
    if posts:
        reviewed=0
        for row in posts:
            summary=row.get('summary',{})
            if isinstance(summary,str):
                try:summary=json.loads(summary)
                except ValueError:summary={}
            if isinstance(summary,dict) and summary.get('quality') in {'grounded','no_call'} and summary.get('source',{}).get('summary_reviewed') is True:
                reviewed+=1
        coverage={'indexed_posts':len(posts),'reviewed_posts':reviewed}
    return {'schema':'kol-feed/1','access':'catalog_only','generated_at':doc.get('generated_at'),
            'as_of':doc.get('as_of'),'kols':creators,'posts':[],'coverage':coverage}


def sanitize_creator_catalog(directory):
    from pathlib import Path
    path=Path(directory)/'kol-feed.json'
    if not path.exists():return
    doc=json.loads(path.read_text())
    path.write_text(json.dumps(public_catalog(doc),ensure_ascii=False,indent=1)+'\n')
