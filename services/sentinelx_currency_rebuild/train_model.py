"""Train six-class denomination recognition from dataset folders A-F.
A=10, B=20, C=50, D=100, E=200, F=500. This is NOT authenticity training.
"""
import os, glob, json, argparse
from collections import Counter
import cv2, numpy as np, joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from model_engine import extract_features_from_bgr, FEATURE_VERSION

LABELS={'A':'10','B':'20','C':'50','D':'100','E':'200','F':'500'}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--data',default='dataset',help='Folder containing A/ B/ C/ D/ E/ F/'); ap.add_argument('--out',default='models'); args=ap.parse_args()
    X=[]; y=[]
    for folder,label in LABELS.items():
        files=[]
        for ext in ('*.jpg','*.jpeg','*.png','*.webp'):
            files += glob.glob(os.path.join(args.data,folder,ext))
        for path in files:
            img=cv2.imread(path)
            if img is None: continue
            X.append(extract_features_from_bgr(img)); y.append(label)
        print(f'{folder} -> ₹{label}: {len(files)} files')
    X=np.asarray(X,np.float32); y=np.asarray(y)
    if len(y)<24 or len(set(y)) != 6: raise SystemExit('Need at least 4 readable images in each of A-F.')
    Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.25,random_state=42,stratify=y)
    candidates={
      'random_forest':RandomForestClassifier(n_estimators=500,min_samples_leaf=2,max_features='sqrt',class_weight='balanced_subsample',random_state=42,n_jobs=-1),
      'extra_trees':ExtraTreesClassifier(n_estimators=500,min_samples_leaf=2,max_features='sqrt',class_weight='balanced',random_state=42,n_jobs=-1)}
    scores={}
    for name,model in candidates.items():
        model.fit(Xtr,ytr); pred=model.predict(Xte)
        scores[name]={'accuracy':float(accuracy_score(yte,pred)), 'report':classification_report(yte,pred,output_dict=True,zero_division=0),
                      'confusion_matrix':confusion_matrix(yte,pred,labels=list(LABELS.values())).tolist()}
        print(name, 'holdout accuracy:', round(scores[name]['accuracy']*100,2),'%')
    best=max(candidates,key=lambda n:scores[n]['report']['macro avg']['f1-score'])
    final=candidates[best].fit(X,y)
    os.makedirs(args.out,exist_ok=True)
    counts=dict(Counter(y))
    joblib.dump({'model':final,'labels':list(LABELS.values()),'feature_version':FEATURE_VERSION,'training_count':len(y),'class_counts':counts},os.path.join(args.out,'sentinelx_denomination_model.joblib'),compress=3)
    meta={'model_name':'SentinelX-INR-Denomination-v1','task':'six-class denomination recognition only','authenticity_detection_supported':False,
          'trained_images':len(y),'class_counts':counts,'holdout':{'test_size':.25,'random_state':42,'samples':len(yte),'selected_model':best,
          'accuracy':scores[best]['accuracy'],'macro_f1':scores[best]['report']['macro avg']['f1-score'],
          'classification_report':scores[best]['report'],'confusion_matrix_labels':list(LABELS.values()),'confusion_matrix':scores[best]['confusion_matrix']},
          'warning':'No non-banknote, genuine/counterfeit, or specimen labels were provided. Do not claim authenticity.'}
    with open(os.path.join(args.out,'model_metadata.json'),'w') as f: json.dump(meta,f,indent=2)
    print('Saved model to',args.out,'; selected',best)
if __name__=='__main__': main()
