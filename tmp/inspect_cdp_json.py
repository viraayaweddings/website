import json

data = json.load(open("tmp/rategain_cdp_results.json", encoding="utf-8"))
for item in data[:2]:
    print("---", item["label"])
    samples = item["requestSummary"].get("samples", {})
    for key, values in samples.items():
        print(key)
        for value in values[:5]:
            print(" ", value)
