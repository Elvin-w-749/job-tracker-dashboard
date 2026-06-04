import sys

def modify():
    with open(r'G:\Coding\投递进度2\backend\main.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        # Add model_name fetch in /api/jd/analyze
        if '@app.post("/api/jd/analyze")' in line:
            for j in range(i, i+10):
                if 'def analyze_jd(' in lines[j]:
                    lines[j] = lines[j].replace('):', ', model_name: str | None = Depends(get_minimax_model)):')
                    break
        
        # Add model_name param in _process_batch
        if 'def _process_batch(task_id: str' in line:
            lines[i] = line.replace('user_id: str):', 'user_id: str, model_name: str | None = None):')

        # Add model_name in /api/applications/analyze
        if '@app.post("/api/applications/analyze")' in line:
            for j in range(i, i+10):
                if 'def analyze_file(' in lines[j]:
                    lines[j] = lines[j].replace('):', ', model_name: str | None = Depends(get_minimax_model)):')
                    break
                    
        # Add model_name in _run_batch_score
        if 'def _run_batch_score(' in line:
            lines[i] = line.replace('user_id: str):', 'user_id: str, model_name: str | None = None):')

    # Now let's handle the endpoints that call _process_batch and _run_batch_score
    for i, line in enumerate(lines):
        if '@app.post("/api/jd/batch-upload")' in line:
            for j in range(i, i+10):
                if 'def batch_upload(' in lines[j]:
                    lines[j] = lines[j].replace('):', ', model_name: str | None = Depends(get_minimax_model)):')
                    break
                    
        if '@app.post("/api/applications/batch-score")' in line:
            for j in range(i, i+10):
                if 'def batch_score(' in lines[j]:
                    lines[j] = lines[j].replace('):', ', model_name: str | None = Depends(get_minimax_model)):')
                    break
                    
        if '@app.post("/api/applications/{app_id}/score")' in line:
            for j in range(i, i+10):
                if 'def single_score(' in lines[j]:
                    lines[j] = lines[j].replace('):', ', model_name: str | None = Depends(get_minimax_model)):')
                    break

        # Pass model_name to _process_batch and _run_batch_score
        if 'asyncio.create_task(_process_batch(' in line:
            lines[i] = line.replace('user_id)', 'user_id, model_name)')
        if 'asyncio.create_task(_run_batch_score(' in line:
            lines[i] = line.replace('user_id)', 'user_id, model_name)')

    with open(r'G:\Coding\投递进度2\backend\main.py', 'w', encoding='utf-8') as f:
        f.writelines(lines)

modify()
