import json

# 1
with open('keywords.txt', 'r') as k:
    keywords = k.read().splitlines()
    
#2
with open('metadata.csv') as f, open('en-IN-botid-LJSpeechP1.json', 'w') as o:
    sample = {}
    for aline in f:
        line = aline.lower()
        if any(key in line for key in keywords):
            arrayData = line.split('|')
            sample[arrayData[0]] = {"filename": arrayData[0]+".wav", "text":arrayData[2].rstrip('\n')}
            #o.writelines(line)
    response = json.dumps(sample, indent=4)
    o.write(response)
