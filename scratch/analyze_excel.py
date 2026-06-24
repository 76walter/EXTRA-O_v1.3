import pandas as pd
import sys

try:
    file = 'Churn 01-2026 - Janeiro.xlsx'
    df = pd.read_excel(file, header=None)
    
    found = False
    for r in range(min(100, len(df))):
        for c in range(len(df.columns)):
            val = str(df.iloc[r, c]).lower()
            if 'número2' in val:
                print(f'HEADER_FOUND: Row={r}, Col={c}, Name={df.iloc[r,c]}')
                print('SAMPLE_DATA:')
                print(df.iloc[r+1:r+15, c])
                found = True
                break
        if found: break
    
    if not found:
        print("Header 'Número2' not found in the first 100 rows.")
except Exception as e:
    print(f"Error: {e}")
