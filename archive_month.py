import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase configuration. Make sure .env file exists with proper values.")

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

def fetch_february_scores():
    url = f"{SUPABASE_URL}/rest/v1/daily_scores"
    
    params = {
        'select': '*,players(name)',
        'date': f'gte.2024-02-01',
        'date': f'lte.2024-02-29',
        'archived': 'eq.false'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        scores = response.json()
        
        if not scores:
            print("No unarchived scores found for February 2024")
            return
        
        print(f"Found {len(scores)} unarchived scores for February:")
        for score in scores:
            player_name = score['players']['name']
            date = score['date']
            total = score['total']
            print(f"{date}: {player_name} - {total} points")
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching scores: {str(e)}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")

if __name__ == "__main__":
    print("Checking connection to Supabase...")
    try:
        # Test connection
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
        response.raise_for_status()
        print("Successfully connected to Supabase")
        
        # Fetch scores
        fetch_february_scores()
        
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"Status code: {e.response.status_code}")
            print(f"Response: {e.response.text}")